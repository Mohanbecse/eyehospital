import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  private toastId = 0;

  showError(message: string, duration = 5000): void {
    this.addToast({
      id: ++this.toastId,
      message,
      type: 'error',
      duration
    });
  }

  showSuccess(message: string, duration = 3000): void {
    this.addToast({
      id: ++this.toastId,
      message,
      type: 'success',
      duration
    });
  }

  showWarning(message: string, duration = 4000): void {
    this.addToast({
      id: ++this.toastId,
      message,
      type: 'warning',
      duration
    });
  }

  showInfo(message: string, duration = 3000): void {
    this.addToast({
      id: ++this.toastId,
      message,
      type: 'info',
      duration
    });
  }

  removeToast(id: number): void {
    const current = this.toastsSubject.getValue();
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }

  private addToast(toast: ToastMessage): void {
    const current = this.toastsSubject.getValue();
    this.toastsSubject.next([...current, toast]);

    setTimeout(() => {
      this.removeToast(toast.id);
    }, toast.duration || 5000);
  }
}