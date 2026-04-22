import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../services/modal.service';
import { ReportPopupComponent } from './report-popup.component';

@Component({
  selector: 'app-global-modal-registry',
  standalone: true,
  imports: [CommonModule, ReportPopupComponent],
  template: `
    @if (modal.activeModal()) {
      <div class="fixed inset-0 z-[1000]">
        @switch (modal.activeModal()) {
          @case ('REPORT') {
            <app-report-popup 
              [articleTitle]="modal.modalData()?.articleTitle" 
              (onClose)="modal.closeModal()" 
              (onReportSubmitted)="modal.modalData()?.onReportSubmitted($event)"
            ></app-report-popup>
          }
          @case ('ECHO_VIEWER') {
            <div class="fixed inset-0 bg-black flex items-center justify-center text-white">EchoViewer Placeholder</div>
          }
          @case ('TROPHY_VIEWER') {
            <div class="fixed inset-0 bg-black flex items-center justify-center text-white">TrophyViewer Placeholder</div>
          }
          @case ('HALL_OF_FAME') {
            <div class="fixed inset-0 bg-black flex items-center justify-center text-white">HallOfFame Placeholder</div>
          }
          @case ('SHARE') {
            <div class="fixed inset-0 bg-black flex items-center justify-center text-white">ShareModal Placeholder</div>
          }
        }
      </div>
    }
  `
})
export class GlobalModalRegistryComponent {
  modal = inject(ModalService);
}
