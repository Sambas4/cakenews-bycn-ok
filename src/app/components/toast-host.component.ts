import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../services/toast.service';

/**
 * Stack of transient notifications anchored above the bottom-nav. Pure
 * presentation: lifetime is owned by `ToastService`. Designed to never
 * intercept clicks behind it (pointer-events on individual toasts only).
 */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div role="status" aria-live="polite" aria-atomic="false"
         class="pointer-events-none fixed left-0 right-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[1100] flex flex-col items-center gap-2 px-3">
      @for (t of toastSvc.toasts(); track t.id) {
        <div
          [attr.role]="t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'"
          class="pointer-events-auto max-w-[420px] w-full flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl text-[13px] font-semibold animate-[toastIn_.2s_ease-out]"
          [ngClass]="{
            'bg-emerald-500/15 border-emerald-400/30 text-emerald-100': t.type === 'success',
            'bg-red-500/15 border-red-400/30 text-red-100': t.type === 'error',
            'bg-amber-500/15 border-amber-400/30 text-amber-100': t.type === 'warning',
            'bg-white/8 border-white/15 text-white': t.type === 'info'
          }">
          <lucide-icon [name]="iconFor(t.type)" class="w-4 h-4 shrink-0" aria-hidden="true"></lucide-icon>
          <span class="flex-1 leading-tight">{{ t.message }}</span>
          <button type="button"
            (click)="toastSvc.removeToast(t.id)"
            [attr.aria-label]="'Fermer la notification : ' + t.message"
            class="opacity-60 hover:opacity-100 transition-opacity p-1 -mr-1">
            <lucide-icon name="x" class="w-3.5 h-3.5" aria-hidden="true"></lucide-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class ToastHostComponent {
  toastSvc = inject(ToastService);

  iconFor(type: string): string {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      case 'warning': return 'alert-triangle';
      default: return 'info';
    }
  }
}
