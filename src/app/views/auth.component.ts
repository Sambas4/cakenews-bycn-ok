import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
      <div class="w-full h-full bg-black flex flex-col items-center justify-center p-6 relative">
          <!-- Temporary skip auth button for demo bypass -->
          <button (click)="skipAuth()" class="absolute top-8 right-8 text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
            Skip (Demo)
          </button>

          <div class="w-full max-w-xs text-center flex flex-col items-center gap-6">
              <h1 class="text-4xl font-[1000] uppercase tracking-tighter text-white mb-2">CAKENEWS</h1>
              
              <div *ngIf="!authService.isAuthReady()" class="text-white text-sm animate-pulse">
                 Chargement sécurisé...
              </div>

              <!-- Option Google -->
              <div *ngIf="authService.isAuthReady()" class="w-full flex flex-col gap-4">
                <div *ngIf="errorMessage()" class="text-red-500 text-sm font-medium p-2 bg-red-500/10 rounded border border-red-500/20">
                  {{ errorMessage() }}
                </div>

                <button 
                    (click)="loginWithGoogle()" 
                    [disabled]="isLoading()"
                    class="flex items-center justify-center gap-3 w-full p-4 bg-white text-black font-[1000] uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-6 h-6" alt="Google" />
                  <span>Connexion Google</span>
                </button>
                <div class="mt-4 text-xs text-center text-zinc-500 max-w-sm mx-auto">
                   <p>Note : La connexion Google nécessite d'être configurée dans Supabase (Auth > Providers > Google).</p>
                </div>
              </div>
          </div>
      </div>
  `
})
export class AuthViewComponent {
  private router = inject(Router);
  public authService = inject(AuthService);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  currentOrigin = window.location.origin;

  constructor() {
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      await this.authService.loginWithGoogle();
    } catch(e: any) {
      console.error(e);
      this.errorMessage.set("Erreur de connexion via Google.");
    } finally {
      this.isLoading.set(false);
    }
  }

  skipAuth() {
    this.router.navigate(['/feed']);
  }
}
