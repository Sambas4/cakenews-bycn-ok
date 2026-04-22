import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dossier-module',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="text-white/90 text-base md:text-lg leading-relaxed space-y-6 font-serif">
      @for (paragraph of paragraphs(); track $index) {
        <p class="first-letter:text-4xl first-letter:font-black first-letter:mr-1 first-letter:float-left first-letter:text-white">
          {{ paragraph }}
        </p>
      }
    </div>
  `
})
export class DossierModuleComponent {
  @Input() content: string = '';

  paragraphs = computed(() => {
    return this.content.split('\n\n').filter(p => p.trim().length > 0);
  });
}
