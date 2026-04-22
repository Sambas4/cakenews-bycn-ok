import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-auth-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
      <div class="w-full h-full bg-black flex flex-col items-center justify-center p-6">
          <div class="w-full max-w-xs text-center">
              <h1 class="text-4xl font-[1000] uppercase tracking-tighter text-white mb-2">CAKENEWS</h1>
              <div class="px-4 py-2 bg-zinc-900 border border-amber-500/50 rounded-lg mb-8">
                  <p class="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Mode Démo (Pas de DB)</p>
              </div>
              <form (ngSubmit)="handleDemoAuth()" class="w-full">
                <input 
                    type="password"
                    maxlength="8"
                    name="demoCode"
                    [(ngModel)]="demoCode"
                    placeholder="Code d'accès"
                    class="w-full bg-zinc-900 border-2 border-zinc-800 p-4 text-center text-white text-2xl font-[1000] tracking-[0.2em] rounded-xl outline-none focus:border-white mb-4"
                />
                <button type="submit" class="w-full py-4 bg-white text-black font-[1000] uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-colors">Entrer</button>
              </form>
          </div>
      </div>
  `
})
export class AuthViewComponent {
  private translation = inject(TranslationService);
  private router = inject(Router);
  
  t = this.translation.t;

  demoCode = '';

  handleDemoAuth() {
    if (this.demoCode === '12345678') {
      this.router.navigate(['/admin']);
    } else if (this.demoCode.length > 0) {
      this.router.navigate(['/feed']);
    }
  }
}
