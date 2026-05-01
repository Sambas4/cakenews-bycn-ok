import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

interface SettingItem {
  key: string;
  label: string;
  hint?: string;
  icon: string;
  kind: 'toggle' | 'pick';
  options?: { value: string; label: string }[];
}

interface SettingSection {
  id: string;
  title: string;
  accent: string;
  items: SettingItem[];
}

const SECTIONS: SettingSection[] = [
  {
    id: 'privacy',
    title: 'Confidentialité & chiffrement',
    accent: 'text-emerald-400',
    items: [
      { key: 'e2ee', label: 'Vérifier les clés E2EE', hint: 'Empreintes des appareils connectés', icon: 'lock', kind: 'toggle' },
      { key: 'biometric', label: 'Verrou biométrique', hint: 'Demande Face ID / empreinte à l\'ouverture', icon: 'shield', kind: 'toggle' },
      { key: 'screenshots', label: 'Bloquer les captures', hint: 'Empêche les screenshots des conversations', icon: 'eye-off', kind: 'toggle' },
    ],
  },
  {
    id: 'alerts',
    title: 'Alertes intelligentes',
    accent: 'text-blue-400',
    items: [
      { key: 'replies', label: 'Réponses & mentions', hint: 'Quand quelqu\'un te cite ou te répond', icon: 'message-square', kind: 'toggle' },
      { key: 'rising', label: 'Débats qui décollent', hint: 'Une conversation où tu participes prend de l\'ampleur', icon: 'trending-up', kind: 'toggle' },
      { key: 'breaking', label: 'Breaking news', hint: 'Alertes urgentes uniquement', icon: 'megaphone', kind: 'toggle' },
    ],
  },
  {
    id: 'cadence',
    title: 'Fréquence',
    accent: 'text-violet-400',
    items: [
      {
        key: 'digest',
        label: 'Digest e-mail',
        hint: 'Récap de tes notifications',
        icon: 'mail',
        kind: 'pick',
        options: [
          { value: 'never', label: 'Jamais' },
          { value: 'daily', label: 'Quotidien' },
          { value: 'weekly', label: 'Hebdo' },
        ],
      },
    ],
  },
];

const DEFAULTS: Record<string, boolean | string> = {
  e2ee: true, biometric: false, screenshots: false,
  replies: true, rising: true, breaking: true,
  digest: 'weekly',
};

/**
 * Messaging preferences. Settings are persisted locally; remote sync
 * is the responsibility of the upstream notification preferences API.
 */
@Component({
  selector: 'app-message-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full w-full flex flex-col bg-black text-white">
      <header class="flex-none flex items-center px-2 h-[56px] border-b border-white/[0.05] z-20">
        <button type="button" (click)="back.emit()" aria-label="Retour"
          class="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/5 rounded-full transition-colors mr-1">
          <lucide-icon name="chevron-left" class="w-5 h-5"></lucide-icon>
        </button>
        <h1 class="text-[15px] font-[1000] tracking-tight">Paramètres messagerie</h1>
      </header>

      <div class="flex-1 overflow-y-auto custom-scrollbar pb-10">
        @for (section of sections; track section.id) {
          <div class="mt-6">
            <h2 class="px-5 mb-2 text-[10px] font-black uppercase tracking-[0.2em]" [ngClass]="section.accent">
              {{ section.title }}
            </h2>
            <div class="mx-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04] overflow-hidden">
              @for (item of section.items; track item.key) {
                @if (item.kind === 'toggle') {
                  <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                        <lucide-icon [name]="item.icon" class="w-4 h-4 text-zinc-300"></lucide-icon>
                      </div>
                      <div class="flex flex-col min-w-0">
                        <span class="text-[13.5px] font-bold text-white">{{ item.label }}</span>
                        @if (item.hint) {
                          <span class="text-[10.5px] text-zinc-500 leading-snug">{{ item.hint }}</span>
                        }
                      </div>
                    </div>
                    <button type="button" (click)="toggle(item.key); $event.preventDefault()"
                      class="relative w-10 h-6 rounded-full transition-colors shrink-0"
                      [ngClass]="!!values()[item.key] ? 'bg-[#7ae25c]' : 'bg-white/10'">
                      <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                        [ngClass]="!!values()[item.key] ? 'left-[18px]' : 'left-0.5'"></span>
                    </button>
                  </label>
                } @else {
                  <div class="px-4 py-3.5">
                    <div class="flex items-center gap-3 mb-2">
                      <div class="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                        <lucide-icon [name]="item.icon" class="w-4 h-4 text-zinc-300"></lucide-icon>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-[13.5px] font-bold text-white">{{ item.label }}</span>
                        @if (item.hint) {
                          <span class="text-[10.5px] text-zinc-500">{{ item.hint }}</span>
                        }
                      </div>
                    </div>
                    <div class="grid grid-cols-3 gap-1.5 bg-black/30 p-1 rounded-xl border border-white/[0.04]">
                      @for (opt of item.options ?? []; track opt.value) {
                        <button type="button" (click)="setPick(item.key, opt.value)"
                          class="text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition-all"
                          [ngClass]="values()[item.key] === opt.value ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'">
                          {{ opt.label }}
                        </button>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- Danger -->
        <div class="mt-8 mx-3 bg-red-500/[0.04] border border-red-500/15 rounded-2xl overflow-hidden">
          <button type="button"
            class="w-full flex items-center gap-3 px-4 py-4 text-red-400 hover:bg-red-500/[0.08] active:bg-red-500/15 transition-colors">
            <div class="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <lucide-icon name="archive" class="w-4 h-4"></lucide-icon>
            </div>
            <span class="text-[13.5px] font-bold">Archiver toutes les conversations</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class MessageSettingsComponent {
  back = output<void>();

  readonly sections = SECTIONS;
  readonly values = signal<Record<string, boolean | string>>(this.load());

  toggle(key: string) {
    this.values.update(v => {
      const next = { ...v, [key]: !v[key] };
      this.persist(next);
      return next;
    });
  }

  setPick(key: string, value: string) {
    this.values.update(v => {
      const next = { ...v, [key]: value };
      this.persist(next);
      return next;
    });
  }

  private load(): Record<string, boolean | string> {
    try {
      const raw = localStorage.getItem('cake_msg_prefs');
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private persist(v: Record<string, boolean | string>) {
    try { localStorage.setItem('cake_msg_prefs', JSON.stringify(v)); } catch { /* ignore */ }
  }
}
