import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-solid-block',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="bg-zinc-800 animate-pulse" [ngClass]="className"></div>`
})
export class SolidBlockComponent {
  @Input() className = '';
}

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SolidBlockComponent],
  template: `
    @switch (type) {
      @case ('module') {
        <div class="w-full h-full flex flex-col items-center justify-center p-8 space-y-6">
          <div class="w-full space-y-4">
             <app-solid-block className="h-8 w-3/4 rounded-lg"></app-solid-block>
             <div class="space-y-3">
                <app-solid-block className="h-4 w-full rounded"></app-solid-block>
                <app-solid-block className="h-4 w-11/12 rounded"></app-solid-block>
                <app-solid-block className="h-4 w-full rounded"></app-solid-block>
             </div>
          </div>
        </div>
      }
      @case ('content') {
        <div class="w-full relative overflow-hidden">
           <div class="flex items-center gap-2 mb-8 opacity-50">
              <div class="w-2 h-2 rounded-full animate-flash" [style.backgroundColor]="accentColor"></div>
              <span class="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">Flux entrant...</span>
           </div>
           <div class="h-10 bg-zinc-900 rounded-lg w-5/6 mb-12"></div>
           <div class="space-y-8">
              @for (i of [1, 2, 3]; track i) {
                 <div class="space-y-3 opacity-60">
                    <app-solid-block className="h-4 w-full rounded"></app-solid-block>
                    <app-solid-block className="h-4 w-[90%] rounded"></app-solid-block>
                    <app-solid-block className="h-4 w-[95%] rounded"></app-solid-block>
                 </div>
              }
           </div>
        </div>
      }
      @case ('image') {
        <div class="absolute inset-0 bg-zinc-900 flex items-center justify-center overflow-hidden">
          <div class="flex flex-col items-center gap-2 opacity-30">
              <div class="p-3 bg-white/5 rounded-full">
                 <lucide-icon name="zap" class="w-5 h-5 text-white/50"></lucide-icon>
              </div>
          </div>
        </div>
      }
      @case ('room') {
        <div class="w-full space-y-8 px-4 mt-8">
           <div class="flex items-center gap-2 mb-10 p-1.5 bg-zinc-900/50 rounded-2xl border border-white/5">
              <app-solid-block className="flex-1 h-10 rounded-xl"></app-solid-block>
              <div class="flex-1 h-10 bg-transparent rounded-xl"></div>
           </div>
           @for (i of [1, 2, 3]; track i) {
             <div class="flex flex-col" [ngClass]="i % 2 === 0 ? 'items-end' : 'items-start'">
                <div class="flex items-center gap-2 mb-2">
                   <app-solid-block className="w-6 h-6 rounded-full"></app-solid-block>
                   <app-solid-block className="h-3 w-20 rounded"></app-solid-block>
                </div>
                <div class="w-[85%] h-24 rounded-[24px] bg-zinc-900 border border-white/5" [ngClass]="i % 2 === 0 ? 'rounded-tr-none' : 'rounded-tl-none'"></div>
             </div>
           }
        </div>
      }
      @case ('reseau') {
        <div class="w-full space-y-12">
            <div class="flex items-center justify-between mb-10">
              <app-solid-block className="h-8 w-48 rounded"></app-solid-block>
              <app-solid-block className="h-6 w-24 rounded-full"></app-solid-block>
            </div>
            <div class="space-y-6">
               <div class="flex gap-2 opacity-50">
                  <lucide-icon name="activity" class="w-4 h-4"></lucide-icon>
                  <app-solid-block className="h-4 w-32 rounded"></app-solid-block>
               </div>
               <div class="grid grid-cols-2 gap-3">
                  <div class="h-32 bg-zinc-900 rounded-[24px] border border-white/5"></div>
                  <div class="h-32 bg-zinc-900 rounded-[24px] border border-white/5"></div>
                  <div class="h-32 bg-zinc-900 rounded-[24px] border border-white/5"></div>
               </div>
            </div>
        </div>
      }
      @case ('message') {
         <div class="flex flex-col h-full bg-black overflow-hidden">
            <div class="p-8 pb-4 space-y-8">
               <app-solid-block className="h-10 w-32 rounded-lg"></app-solid-block>
               <div class="flex bg-zinc-900 p-1 border border-white/5 rounded-2xl h-14"></div>
            </div>
            <div class="px-8 space-y-4">
               @for (i of [1, 2, 3]; track i) {
                  <div class="flex gap-4 p-6 rounded-[32px] border border-white/5 bg-zinc-900">
                     <app-solid-block className="w-14 h-14 rounded-2xl"></app-solid-block>
                     <div class="flex-1 space-y-3 py-1">
                        <div class="flex justify-between">
                           <app-solid-block className="h-4 w-24 rounded"></app-solid-block>
                           <app-solid-block className="h-3 w-10 rounded"></app-solid-block>
                        </div>
                        <app-solid-block className="h-3 w-full rounded opacity-50"></app-solid-block>
                     </div>
                  </div>
               }
            </div>
         </div>
      }
      @case ('profile') {
         <div class="p-8 space-y-8">
            <div class="flex justify-between items-center mb-10">
               <app-solid-block className="h-10 w-40 rounded-lg"></app-solid-block>
               <app-solid-block className="w-12 h-12 rounded-lg"></app-solid-block>
            </div>
            <div class="bg-zinc-900 h-48 border-2 border-white/5 mb-12"></div>
            <div class="h-20 w-full bg-zinc-900 rounded-2xl"></div>
            <div class="grid grid-cols-2 gap-4">
               @for (i of [1, 2, 3, 4]; track i) {
                  <div class="h-16 bg-zinc-900 border border-white/5"></div>
               }
            </div>
         </div>
      }
    }
  `
})
export class AppLoaderComponent {
  @Input() type: 'module' | 'content' | 'image' | 'room' | 'reseau' | 'message' | 'profile' = 'module';
  @Input() accentColor: string = '#ffffff';
}
