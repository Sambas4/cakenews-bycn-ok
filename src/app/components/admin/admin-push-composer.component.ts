import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { PushAudience, PushDispatchPayload, SendPushService } from '../../services/send-push.service';
import { PushTemplateService, PushTone } from '../../services/push-template.service';
import { ToastService } from '../../services/toast.service';

type AudienceType = PushAudience['type'];

interface TonePreset {
  id: PushTone;
  label: string;
  icon: string;
}

const TONE_PRESETS: TonePreset[] = [
  { id: 'BREAKING', label: 'Breaking', icon: 'flame' },
  { id: 'PULSE',    label: 'Pulse',    icon: 'activity' },
  { id: 'COUNTER',  label: 'Counter',  icon: 'shield-alert' },
  { id: 'INVITE',   label: 'Débat',    icon: 'message-circle' },
  { id: 'SCOOP',    label: 'Scoop',    icon: 'sparkles' },
];

const AUDIENCE_TABS: { id: AudienceType; label: string }[] = [
  { id: 'all',     label: 'Tout le monde' },
  { id: 'role',    label: 'Par rôle' },
  { id: 'follows', label: 'Followers d\'un auteur' },
  { id: 'user',    label: 'Un utilisateur' },
];

const ROLE_OPTIONS = ['USER', 'EDITOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const;

/**
 * Studio-side composer for sending push notifications to the audience.
 *
 * Flow:
 *   1. Pick a tone preset → fills title/body with the curated template
 *      from {@link PushTemplateService}. Editor can then edit freely.
 *   2. Pick an audience type → exposes the relevant secondary field
 *      (role select / author / user uid).
 *   3. Preview block renders the exact shape the user will see.
 *   4. Send → SendPushService.dispatch, dispatch counters appear in
 *      a toast.
 *
 * Lives in the ANTENNE tab — same neighbourhood as the ticker
 * broadcasts. Editorial reasoning: both are outbound messages.
 */
@Component({
  selector: 'app-admin-push-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <section class="p-4 bg-zinc-950 border-t border-white/[0.04]">
      <header class="flex items-center gap-2 mb-4">
        <lucide-icon name="bell" class="w-4 h-4 text-amber-300" aria-hidden="true"></lucide-icon>
        <h2 class="text-[14px] font-[1000] tracking-tight">Composer un push</h2>
        <span class="ml-auto text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Direct vers les abonnés
        </span>
      </header>

      <!-- Tone presets -->
      <div class="mb-4">
        <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Ton éditorial</label>
        <div class="grid grid-cols-5 gap-1.5">
          @for (preset of tonePresets; track preset.id) {
            <button type="button" (click)="applyPreset(preset.id)"
              [attr.aria-pressed]="activeTone() === preset.id"
              class="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border transition-all"
              [ngClass]="activeTone() === preset.id
                ? 'bg-white text-black border-white shadow'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:text-white hover:border-white/20'">
              <lucide-icon [name]="preset.icon" class="w-4 h-4" aria-hidden="true"></lucide-icon>
              <span class="text-[9px] font-black uppercase tracking-widest">{{ preset.label }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Title / body -->
      <div class="grid gap-2 mb-4">
        <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Titre</label>
        <input type="text" [(ngModel)]="titleInput" maxlength="60"
          aria-label="Titre du push"
          class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[14px] font-semibold outline-none focus:border-[#7ae25c]"
          placeholder="🔥 Breaking" />

        <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">Corps</label>
        <textarea [(ngModel)]="bodyInput" maxlength="220" rows="3"
          aria-label="Corps du push"
          class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[13.5px] outline-none focus:border-[#7ae25c] resize-none"
          placeholder="Ton message éditorial…"></textarea>

        <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">Lien profond (optionnel)</label>
        <input type="text" [(ngModel)]="urlInput"
          aria-label="URL de destination"
          class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[13px] font-mono outline-none focus:border-[#7ae25c]"
          placeholder="/article/abc123" />
      </div>

      <!-- Audience -->
      <div class="mb-4">
        <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Audience</label>
        <div class="grid grid-cols-4 gap-1.5 bg-black/30 p-1 rounded-xl border border-white/[0.04] mb-3">
          @for (tab of audienceTabs; track tab.id) {
            <button type="button" (click)="audienceType.set(tab.id)"
              [attr.aria-pressed]="audienceType() === tab.id"
              class="text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition-all"
              [ngClass]="audienceType() === tab.id ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'">
              {{ tab.label }}
            </button>
          }
        </div>

        @if (audienceType() === 'role') {
          <select [(ngModel)]="roleInput"
            aria-label="Rôle ciblé"
            class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[13.5px] outline-none focus:border-[#7ae25c]">
            @for (r of roleOptions; track r) {
              <option [value]="r">{{ r }}</option>
            }
          </select>
        }

        @if (audienceType() === 'follows') {
          <input type="text" [(ngModel)]="authorInput"
            aria-label="Nom de l'auteur"
            class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[13.5px] outline-none focus:border-[#7ae25c]"
            placeholder="Marie Dupont" />
        }

        @if (audienceType() === 'user') {
          <input type="text" [(ngModel)]="uidInput"
            aria-label="UID de l'utilisateur"
            class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[13px] font-mono outline-none focus:border-[#7ae25c]"
            placeholder="00000000-0000-0000-0000-000000000000" />
        }
      </div>

      <!-- Preview -->
      <div class="mb-4">
        <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Aperçu</label>
        <div class="bg-zinc-900 border border-white/[0.06] rounded-2xl p-4">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <lucide-icon name="bell" class="w-3.5 h-3.5 text-amber-300" aria-hidden="true"></lucide-icon>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-black uppercase tracking-widest text-zinc-500">CakeNews</p>
              <p class="text-[13.5px] font-bold text-white leading-tight mt-0.5 truncate">
                {{ titleInput().trim() || 'Titre du push' }}
              </p>
              <p class="text-[12px] text-zinc-300 leading-snug mt-1 line-clamp-2">
                {{ bodyInput().trim() || 'Le corps de ton message apparaîtra ici.' }}
              </p>
              @if (urlInput()) {
                <p class="text-[10px] text-zinc-500 font-mono mt-1.5 truncate">→ {{ urlInput() }}</p>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Send -->
      <button type="button" (click)="dispatch()" [disabled]="!canSend() || sending()"
        class="w-full h-12 rounded-2xl bg-[#7ae25c] text-black text-[12px] font-black uppercase tracking-widest hover:bg-[#9aef82] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
        @if (sending()) {
          <lucide-icon name="loader" class="w-4 h-4 animate-spin"></lucide-icon>
          Envoi…
        } @else {
          <lucide-icon name="send" class="w-4 h-4"></lucide-icon>
          Envoyer
        }
      </button>
    </section>
  `,
})
export class AdminPushComposerComponent {
  private sendPush = inject(SendPushService);
  private template = inject(PushTemplateService);
  private toast = inject(ToastService);

  protected readonly tonePresets = TONE_PRESETS;
  protected readonly audienceTabs = AUDIENCE_TABS;
  protected readonly roleOptions = ROLE_OPTIONS;

  protected readonly titleInput = signal<string>('');
  protected readonly bodyInput = signal<string>('');
  protected readonly urlInput = signal<string>('');
  protected readonly audienceType = signal<AudienceType>('all');
  protected readonly roleInput = signal<typeof ROLE_OPTIONS[number]>('USER');
  protected readonly authorInput = signal<string>('');
  protected readonly uidInput = signal<string>('');
  protected readonly activeTone = signal<PushTone | null>(null);
  protected readonly sending = signal<boolean>(false);

  protected readonly canSend = computed(() => {
    if (!this.titleInput().trim() || !this.bodyInput().trim()) return false;
    switch (this.audienceType()) {
      case 'role':    return Boolean(this.roleInput());
      case 'follows': return this.authorInput().trim().length > 0;
      case 'user':    return /^[0-9a-fA-F-]{36}$/.test(this.uidInput().trim());
      default:        return true;
    }
  });

  applyPreset(tone: PushTone): void {
    this.activeTone.set(tone);
    const payload = this.template.build(tone, {});
    this.titleInput.set(payload.title);
    this.bodyInput.set(payload.body);
    if (!this.urlInput().trim()) this.urlInput.set(payload.url);
  }

  async dispatch(): Promise<void> {
    if (!this.canSend() || this.sending()) return;
    this.sending.set(true);
    try {
      const audience = this.buildAudience();
      const payload: PushDispatchPayload = {
        title: this.titleInput().trim(),
        body: this.bodyInput().trim(),
        url: this.urlInput().trim() || undefined,
        tone: this.activeTone() ?? undefined,
      };
      const result = await this.sendPush.dispatch(audience, payload);
      if (!result.ok) {
        this.toast.showToast(`Échec : ${result.error ?? 'inconnu'}`, 'error');
        return;
      }
      this.toast.showToast(
        `Push envoyé · ${result.web} web · ${result.ios} iOS · ${result.android} Android` +
          (result.failed ? ` · ${result.failed} échec(s)` : ''),
        'success',
      );
    } finally {
      this.sending.set(false);
    }
  }

  private buildAudience(): PushAudience {
    switch (this.audienceType()) {
      case 'role':    return { type: 'role',    role: this.roleInput() };
      case 'follows': return { type: 'follows', author: this.authorInput().trim() };
      case 'user':    return { type: 'user',    uid: this.uidInput().trim() };
      default:        return { type: 'all' };
    }
  }
}
