import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class ToastContainer {
  private toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  iconFor(type: string): string {
    switch (type) {
      case 'success': return 'fa-solid fa-circle-check';
      case 'error': return 'fa-solid fa-circle-exclamation';
      default: return 'fa-solid fa-circle-info';
    }
  }
}
