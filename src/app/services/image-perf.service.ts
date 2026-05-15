import { Injectable } from '@angular/core';

/**
 * Tiny image-performance helper. Centralised so we can keep CDN
 * conventions (Unsplash sizing parameters, etc.) in one place.
 *
 * Goals:
 *  - Always serve an explicitly sized image — no pulling 4K shots into
 *    a 360-px viewport.
 *  - Pick AVIF/WebP automatically through the CDN's `auto=format` flag
 *    where supported.
 *  - Generate a tiny low-quality preview URL (`lqip`) that the UI can
 *    use as a blurred placeholder while the real one decodes.
 */
@Injectable({ providedIn: 'root' })
export class ImagePerf {
  /**
   * Produce a CDN-optimised image URL for a target render width.
   * No-op (returns the input) when the host isn't recognised.
   */
  optimised(url: string | undefined | null, targetWidthCss: number, opts: { dpr?: number; quality?: number } = {}): string {
    if (!url) return '';
    const dpr = Math.min(opts.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1), 3);
    const w = Math.round(targetWidthCss * dpr);
    const q = Math.max(40, Math.min(opts.quality ?? 70, 90));
    try {
      const u = new URL(url);
      if (u.hostname.includes('images.unsplash.com')) {
        u.searchParams.set('w', String(w));
        u.searchParams.set('q', String(q));
        u.searchParams.set('auto', 'format');
        u.searchParams.set('fit', 'crop');
        return u.toString();
      }
      if (u.hostname.includes('picsum.photos')) {
        // Picsum supports `/seed/<seed>/<w>/<h>`; we just pin the width
        // when the URL exposes one.
        return url; // leave untouched — picsum handles its own sizing
      }
      return url;
    } catch {
      return url;
    }
  }

  /** Low-quality blurred placeholder URL. */
  lqip(url: string | undefined | null): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      if (u.hostname.includes('images.unsplash.com')) {
        u.searchParams.set('w', '24');
        u.searchParams.set('q', '20');
        u.searchParams.set('blur', '50');
        u.searchParams.set('auto', 'format');
        return u.toString();
      }
      return url;
    } catch {
      return url;
    }
  }

  /** `srcset` builder for responsive `<img>` tags. */
  srcset(url: string | undefined | null, widthsCss: number[]): string {
    if (!url) return '';
    return widthsCss.map(w => `${this.optimised(url, w)} ${w}w`).join(', ');
  }
}
