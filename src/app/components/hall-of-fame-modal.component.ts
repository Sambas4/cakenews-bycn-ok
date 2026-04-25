import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-halloffeame-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" (click)="onClose.emit()"></div>
      
      <div class="bg-[#FAFAFA] w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom flex flex-col shadow-2xl">
        
        <div class="p-8 flex flex-col items-center">
            <!-- Icon/Medal Presentation -->
            <div class="w-32 h-32 relative flex items-center justify-center mb-6">
                 <div class="absolute inset-0 bg-amber-500/10 rounded-full blur-xl"></div>
                 <img src="https://cdn-icons-png.flaticon.com/512/3176/3176294.png" class="w-full h-full drop-shadow-xl relative z-10 hover:scale-110 transition-transform duration-500" alt="Medal" />
            </div>

            <!-- Titles -->
            <h2 class="text-2xl font-[1000] text-[#0f2814] mb-3 text-center tracking-tight">Congratulations!</h2>
            <p class="text-[13px] font-medium text-gray-500 text-center leading-relaxed px-4 mb-8">
              You're a <strong class="text-gray-900">Change Maker</strong> now. Your generosity is creating real impact.
            </p>

            <!-- Actions -->
            <div class="flex gap-4 w-full">
              <button 
                class="flex-1 py-4 bg-[#76e259] text-[#0f2814] text-[13px] font-bold rounded-2xl hover:bg-[#68d14d] active:scale-95 transition-all shadow-sm"
              >
                Explore Milestones
              </button>
              <button 
                (click)="onClose.emit()"
                class="flex-1 py-4 bg-white border border-gray-200 text-gray-700 text-[13px] font-bold rounded-2xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
        </div>

      </div>
    </div>
  `
})
export class HallOfFameModalComponent {
  @Output() onClose = new EventEmitter<void>();
}
