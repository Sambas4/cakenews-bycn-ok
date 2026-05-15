import { Injectable } from '@angular/core';

export type PushTone =
  | 'BREAKING'    // urgent, factual
  | 'PULSE'       // viral momentum
  | 'COUNTER'     // counter-brief published
  | 'INVITE'      // invite to a debate / room
  | 'SCOOP';      // exclusive content

export interface PushPayload {
  title: string;
  body: string;
  tone: PushTone;
  /** Deep link target (e.g. `/article/abc`). */
  url: string;
}

export interface PushContext {
  articleTitle?: string;
  articleId?: string;
  category?: string;
  topic?: string;
  participantCount?: number;
}

/**
 * Crafts user-facing push payloads with an editorial voice — never the
 * generic "Marie a aimé ton post" tone of social platforms. Each push
 * is a *headline*, not a notification.
 *
 * Backed by a curated, deterministic set of templates. We deliberately
 * avoid runtime LLM generation here: the editorial voice is a brand
 * asset and must be controllable.
 */
@Injectable({ providedIn: 'root' })
export class PushTemplateService {
  build(tone: PushTone, ctx: PushContext): PushPayload {
    const base = (() => {
      switch (tone) {
        case 'BREAKING': return this.breaking(ctx);
        case 'PULSE':    return this.pulse(ctx);
        case 'COUNTER':  return this.counter(ctx);
        case 'INVITE':   return this.invite(ctx);
        case 'SCOOP':    return this.scoop(ctx);
      }
    })();
    return {
      ...base,
      tone,
      url: ctx.articleId ? `/article/${ctx.articleId}` : '/feed',
    };
  }

  private breaking(ctx: PushContext): Pick<PushPayload, 'title' | 'body'> {
    return {
      title: '🔥 Breaking',
      body: ctx.articleTitle
        ? this.trimBody(ctx.articleTitle)
        : 'Une info vient de tomber. On t\'envoie le brief.',
    };
  }

  private pulse(ctx: PushContext): Pick<PushPayload, 'title' | 'body'> {
    if (ctx.participantCount && ctx.articleTitle) {
      return {
        title: '⚡ Ça décolle',
        body: `${ctx.participantCount.toLocaleString('fr')} lecteurs réagissent à « ${this.trimBody(ctx.articleTitle, 70)} »`,
      };
    }
    return {
      title: '⚡ Pulse',
      body: ctx.articleTitle
        ? `Ton flux s'enflamme autour de « ${this.trimBody(ctx.articleTitle, 70)} »`
        : 'Une discussion explose dans ton flux.',
    };
  }

  private counter(ctx: PushContext): Pick<PushPayload, 'title' | 'body'> {
    return {
      title: '🛰 Counter-Brief',
      body: ctx.articleTitle
        ? `Ta question valait le coup : on a creusé « ${this.trimBody(ctx.articleTitle, 60)} »`
        : 'On a creusé l\'angle que la communauté demandait.',
    };
  }

  private invite(ctx: PushContext): Pick<PushPayload, 'title' | 'body'> {
    return {
      title: '🎙 Débat ouvert',
      body: ctx.topic
        ? `Tu es appelé sur « ${ctx.topic} ». La salle est chaude.`
        : 'Un débat lancé t\'attend dans le Cercle.',
    };
  }

  private scoop(ctx: PushContext): Pick<PushPayload, 'title' | 'body'> {
    return {
      title: '🔓 Scoop',
      body: ctx.articleTitle
        ? `Réservé à ta communauté : ${this.trimBody(ctx.articleTitle, 80)}`
        : 'Un scoop de la rédaction vient de débarquer.',
    };
  }

  private trimBody(text: string, max = 100): string {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trimEnd() + '…';
  }
}
