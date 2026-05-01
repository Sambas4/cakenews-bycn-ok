import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../services/modal.service';
import { ReportPopupComponent } from './report-popup.component';
import { ToastHostComponent } from './toast-host.component';

@Component({
  selector: 'app-global-modal-registry',
  standalone: true,
  imports: [CommonModule, ReportPopupComponent, ToastHostComponent],
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
        }
      </div>
    }
    <app-toast-host></app-toast-host>
  `
})
export class GlobalModalRegistryComponent {
  modal = inject(ModalService);
}
