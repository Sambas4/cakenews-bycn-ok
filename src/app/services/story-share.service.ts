import { Injectable } from '@angular/core';
import { Article } from '../types';
import { CATEGORY_COLORS } from '../constants';

export interface StoryRenderOptions {
  /** Vibe ratios 0..1 — chosen colour stripe at the bottom. */
  vibe?: { choque: number; sceptique: number; bullish: number; valide: number };
  /** Optional override of the byline ("L'œil de @username"). */
  byline?: string;
}

const STORY_W = 1080;
const STORY_H = 1920;

/**
 * Generates a 9:16 branded "story" image from an article. Designed for
 * out-of-app sharing — Instagram / Snapchat / WhatsApp. The CakeNews
 * brand stays on every shared frame even when the article URL doesn't.
 *
 * Pure client-side via canvas. No network calls. The article cover image
 * is drawn from CDN with `crossOrigin = 'anonymous'` so the export
 * remains untainted; if CORS blocks the image, we fall back to a clean
 * gradient using the category accent.
 */
@Injectable({ providedIn: 'root' })
export class StoryShareService {
  /**
   * Render a story PNG and return it as a Blob.
   * Throws if the platform doesn't support the canvas API (SSR, etc.).
   */
  async render(article: Article, opts: StoryRenderOptions = {}): Promise<Blob> {
    if (typeof document === 'undefined') throw new Error('Story rendering needs the browser');

    const canvas = document.createElement('canvas');
    canvas.width = STORY_W;
    canvas.height = STORY_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context available');

    const accent = CATEGORY_COLORS[article.category] ?? '#7ae25c';

    // Background (cover image with darkening, fallback to gradient).
    try {
      const img = await this.loadImage(article.imageUrl);
      this.drawCover(ctx, img);
    } catch {
      this.drawGradient(ctx, accent);
    }
    this.drawDarkScrim(ctx);

    // Top brand strip
    this.drawBrandStrip(ctx, accent);

    // Category chip
    this.drawCategoryChip(ctx, article.category, accent);

    // Title block
    this.drawTitle(ctx, article.title);

    // Vibe stripe (if any)
    if (opts.vibe) this.drawVibeStripe(ctx, opts.vibe);

    // Footer (byline + CTA)
    this.drawFooter(ctx, opts.byline);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png', 0.92);
    });
  }

  /** Convenience helper — triggers a download of the rendered story. */
  async download(article: Article, opts: StoryRenderOptions = {}, fileName = 'cakenews-story.png') {
    const blob = await this.render(article, opts);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ────────────────────────────────────────────────────────────────
  // Drawing primitives
  // ────────────────────────────────────────────────────────────────

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image load failed'));
      img.referrerPolicy = 'no-referrer';
      img.src = src;
    });
  }

  private drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
    // Cover-fit the image into the 1080x1920 canvas.
    const scale = Math.max(STORY_W / img.width, STORY_H / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (STORY_W - w) / 2;
    const y = (STORY_H - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  }

  private drawGradient(ctx: CanvasRenderingContext2D, accent: string) {
    const grad = ctx.createLinearGradient(0, 0, 0, STORY_H);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  }

  private drawDarkScrim(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 0, STORY_H);
    grad.addColorStop(0, 'rgba(0,0,0,0.45)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  }

  private drawBrandStrip(ctx: CanvasRenderingContext2D, accent: string) {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, STORY_W, 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Open Sans", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('CAKENEWS', 60, 90);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 22px "Open Sans", system-ui, sans-serif';
    ctx.fillText('L\'INFO HUMAINE', 60, 138);
  }

  private drawCategoryChip(ctx: CanvasRenderingContext2D, category: string, accent: string) {
    const label = category.toUpperCase();
    const padX = 28;
    const padY = 14;
    ctx.font = '900 28px "Open Sans", system-ui, sans-serif';
    const w = ctx.measureText(label).width + padX * 2;
    const x = 60;
    const y = STORY_H - 1080;

    ctx.fillStyle = accent;
    this.roundRect(ctx, x, y, w, 56, 16);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + padX, y + 28);
  }

  private drawTitle(ctx: CanvasRenderingContext2D, title: string) {
    const x = 60;
    const y = STORY_H - 1000;
    ctx.fillStyle = '#fff';
    ctx.font = '900 72px "Open Sans", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    this.wrapText(ctx, title, x, y, STORY_W - 120, 88);
  }

  private drawVibeStripe(ctx: CanvasRenderingContext2D, v: NonNullable<StoryRenderOptions['vibe']>) {
    const total = v.choque + v.sceptique + v.bullish + v.valide;
    if (total <= 0) return;
    const segments = [
      { ratio: v.choque / total,    color: '#f97316' },
      { ratio: v.sceptique / total, color: '#facc15' },
      { ratio: v.bullish / total,   color: '#7ae25c' },
      { ratio: v.valide / total,    color: '#38bdf8' },
    ];
    const x0 = 60;
    const w = STORY_W - 120;
    const y = STORY_H - 380;
    let cursor = x0;
    for (const s of segments) {
      const sw = w * s.ratio;
      ctx.fillStyle = s.color;
      ctx.fillRect(cursor, y, sw, 14);
      cursor += sw;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '700 22px "Open Sans", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('Vibe de la communauté', x0, y + 28);
  }

  private drawFooter(ctx: CanvasRenderingContext2D, byline?: string) {
    const x = 60;
    const yByline = STORY_H - 250;
    if (byline) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 32px "Open Sans", system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(byline, x, yByline);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '900 28px "Open Sans", system-ui, sans-serif';
    ctx.fillText('▶  Lis l\'audit complet sur CakeNews', x, STORY_H - 160);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(/\s+/);
    let line = '';
    let yy = y;
    for (let i = 0; i < words.length; i++) {
      const test = line ? `${line} ${words[i]}` : words[i] ?? '';
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = words[i] ?? '';
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }
}
