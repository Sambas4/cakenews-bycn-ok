import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-reading-progress-bar',
  standalone: true,
  template: `
    <div class="w-full h-[2px] bg-white/5 pointer-events-none">
      <div 
        class="h-full transition-all duration-200 ease-out"
        [style.width]="(progress * 100) + '%'"
        [style.backgroundColor]="accentColor"
      ></div>
    </div>
  `
})
export class ReadingProgressBarComponent {
  @Input() progress = 0;
  @Input() accentColor = '#ffffff';
}
