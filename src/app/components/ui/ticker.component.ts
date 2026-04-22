import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ticker-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div 
        class="w-full overflow-hidden flex whitespace-nowrap pointer-events-none select-none relative"
        style="contain: layout paint style;"
      >
        <div class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10"></div>
        <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10"></div>

        <div 
          class="flex shrink-0"
          [ngClass]="[direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right', className]"
          [style.animationDuration]="duration"
          style="will-change: transform; transform: translate3d(0, 0, 0); backface-visibility: hidden; -webkit-font-smoothing: antialiased;"
        >
          <span class="px-4 translate-z-0">{{content}}</span>
          <span class="px-4 translate-z-0">{{content}}</span>
        </div>
      </div>
    }
  `
})
export class TickerRowComponent implements OnChanges {
  @Input() text = '';
  @Input() duration = '20s';
  @Input() direction: 'left' | 'right' = 'left';
  @Input() className = '';
  @Input() isVisible = true;

  content = '';

  ngOnChanges() {
    this.content = Array(4).fill(this.text).join('     •     ');
  }
}
