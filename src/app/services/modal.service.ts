import { Injectable, signal } from '@angular/core';

export type ModalType = 'SHARE' | 'REPORT' | 'TROPHY' | 'AUTH' | null;

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  activeModal = signal<ModalType>(null);
  modalData = signal<any>(null);

  openModal(type: ModalType, data?: any) {
    this.activeModal.set(type);
    if (data) this.modalData.set(data);
  }

  closeModal() {
    this.activeModal.set(null);
    this.modalData.set(null);
  }
}
