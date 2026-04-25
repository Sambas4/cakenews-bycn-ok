import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

type Category = 'Vêtements Noirs' | 'Vêtements Blancs';

@Component({
  selector: 'app-onboarding-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="w-full h-full bg-[#FAFAFA] flex flex-col items-center p-8 relative overflow-y-auto hide-scrollbar">
      
      <div class="w-full max-w-md text-center flex flex-col items-center mt-12 mb-20 overflow-hidden">
        <h1 class="text-3xl font-[1000] tracking-tighter text-[#0f2814] mb-2">Créez votre profil</h1>
        <p class="text-sm font-semibold text-[#0f2814]/50 mb-10">
          Votre e-mail restera privé.
        </p>

        <!-- Saisir un Pseudo -->
        <div class="w-full mb-10">
            <h2 class="text-left text-sm font-black text-[#0f2814]/80 uppercase tracking-widest mb-3"># 1. Votre Pseudo</h2>
            <input 
                type="text" 
                [(ngModel)]="username" 
                placeholder="Ex: Curieux99..." 
                maxlength="30"
                class="w-full bg-white border-2 border-gray-200 p-4 text-[#0f2814] text-lg font-bold rounded-2xl outline-none focus:border-[#7ae25c] transition-colors shadow-sm"
            />
        </div>

        <!-- Choisir un Avatar -->
        <div class="w-full mb-8 relative">
            <h2 class="text-left text-sm font-black text-[#0f2814]/80 uppercase tracking-widest mb-4"># 2. Votre Avatar public</h2>
            
            <!-- Category Tabs -->
            <div class="flex gap-2 w-full p-1 bg-gray-200 rounded-xl mb-4">
               @for(cat of categories; track cat) {
                 <button 
                   (click)="selectedCategory.set(cat); selectedSeedIndex.set(null)"
                   class="flex-1 py-3 text-xs font-bold rounded-lg transition-colors uppercase tracking-widest"
                   [ngClass]="selectedCategory() === cat ? 'bg-white text-[#0f2814] shadow-sm' : 'text-[#0f2814]/50 hover:bg-white/50'"
                 >
                   {{ cat }}
                 </button>
               }
            </div>

            <!-- Avatar Horizontal Scroll -->
            <div class="flex gap-4 mb-8 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 w-[calc(100%+2rem)]">
                <!-- Using predictable static seeds to ensure browser caching and fast loading -->
                @for(seed of currentCategorySeeds(); track seed; let idx = $index) {
                    <button 
                        (click)="selectedSeedIndex.set(idx)"
                        class="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-2 transition-all relative flex items-center justify-center cursor-pointer overflow-hidden snap-center"
                        [ngStyle]="{ 'background-color': selectedColor() }"
                        [ngClass]="selectedSeedIndex() === idx ? 'border-[#7ae25c] scale-110 shadow-lg z-10' : 'border-black/5 hover:border-black/20 hover:scale-105'"
                    >
                        <img 
                          [src]="buildAvatarUrl(seed)" 
                          loading="lazy"
                          class="w-[120%] h-[120%] object-contain" 
                          referrerpolicy="no-referrer"
                        />
                        @if (selectedSeedIndex() === idx) {
                          <div class="absolute bottom-0 right-0 bg-[#7ae25c] rounded-tl-xl p-1 text-black">
                            <lucide-icon name="check" class="w-4 h-4"></lucide-icon>
                          </div>
                        }
                    </button>
                }
            </div>

            <!-- Color Picker -->
            <div class="w-full">
              <h3 class="text-left text-xs font-bold text-[#0f2814]/50 uppercase tracking-widest mb-3">Couleur de fond</h3>
              <div class="flex gap-2 justify-between">
                @for(color of bgColors; track color) {
                   <button
                     (click)="selectedColor.set(color)"
                     class="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-transform cursor-pointer hover:scale-110"
                     [ngStyle]="{ 'background-color': color }"
                     [ngClass]="selectedColor() === color ? 'border-[#0f2814] scale-110 shadow-md' : 'border-black/10'"
                   ></button>
                }
              </div>
            </div>
        </div>

        <div *ngIf="errorMessage()" class="w-full text-red-600 text-xs font-bold p-4 bg-red-50 rounded-xl mb-4 text-center border border-red-100">
          {{ errorMessage() }}
        </div>

        <button 
            (click)="finishOnboarding()"
            [disabled]="isSaving() || !username() || selectedSeedIndex() === null"
            class="w-full mt-2 py-5 bg-[#7ae25c] text-[#0f2814] font-[1000] uppercase tracking-widest rounded-2xl hover:bg-[#68c74e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          @if (isSaving()) {
             <lucide-icon name="loader" class="w-5 h-5 animate-spin"></lucide-icon>
             Finalisation...
          } @else {
             Rejoindre la communauté
          }
        </button>
      </div>
    </div>
  `
})
export class OnboardingViewComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  username = signal('');
  
  categories: Category[] = ['Vêtements Noirs', 'Vêtements Blancs'];
  selectedCategory = signal<Category>('Vêtements Noirs');
  
  // 20 seeds per category. Note: The external API randomly determines the exact drawing per seed,
  // we use a predefined list of seeds that have been visually checked (or can be adjusted) to match black/white clothes.
  seedsMap: Record<Category, string[]> = {
    'Vêtements Noirs': [
        'Seed1', 'Jocelyn', 'Dark1', 'Dark2', 'Dark3', 'Dark4', 'Dark5', 'Dark6', 'Dark7', 'Dark8', 
        'Dark9', 'Dark10', 'Dark11', 'Dark12', 'Dark13', 'Dark14', 'Dark15', 'Dark16', 'Dark17', 'Dark18'
    ],
    'Vêtements Blancs': [
        'Seed2', 'Felix', 'Light1', 'Light2', 'Light3', 'Light4', 'Light5', 'Light6', 'Light7', 'Light8',
        'Light9', 'Light10', 'Light11', 'Light12', 'Light13', 'Light14', 'Light15', 'Light16', 'Light17', 'Light18'
    ]
  };

  // Pastel and neutral background colors + hex codes for Dicebear
  bgColors = ['#F9A8D4', '#C4B5FD', '#93C5FD', '#86EFAC', '#FDE047', '#FDBA74', '#D1D5DB', '#F8FAFC'];
  selectedColor = signal<string>('#93C5FD');

  selectedSeedIndex = signal<number | null>(null);

  isSaving = signal(false);
  errorMessage = signal('');

  currentCategorySeeds = computed(() => this.seedsMap[this.selectedCategory()]);

  buildAvatarUrl(seed: string) {
    // using 'notionists' theme with transparent background
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=transparent`;
  }

  async finishOnboarding() {
    const user = this.authService.currentUser();
    const pseudo = this.username().trim();
    const sIndex = this.selectedSeedIndex();

    if (!user) {
      this.errorMessage.set("Session expirée. Veuillez vous reconnecter.");
      this.router.navigate(['/auth']);
      return;
    }

    if (!pseudo || pseudo.length < 3) {
      this.errorMessage.set("Le pseudo doit faire au moins 3 caractères.");
      return;
    }

    if (sIndex === null) {
      this.errorMessage.set("Veuillez sélectionner un avatar.");
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      const hexColor = this.selectedColor(); // Raw hex color
      const seeds = this.currentCategorySeeds();
      const selectedSeed = seeds[sIndex];
      
      const finalAvatarUrl = this.buildAvatarUrl(selectedSeed);
      
      // Save avatarBg to profile!
      await this.userService.createUserProfile(user.uid, pseudo, finalAvatarUrl, hexColor);
      this.router.navigate(['/feed']);
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set("Une erreur est survénue. Veuillez réessayer.");
    } finally {
      this.isSaving.set(false);
    }
  }
}
