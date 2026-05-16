import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts; track toast.id) {
        <div class="toast toast-{{toast.type}}" (click)="closeToast(toast.id)">
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('error') { ⚠️ }
              @case ('success') { ✅ }
              @case ('warning') { ⚡ }
              @case ('info') { ℹ️ }
            }
          </div>
          <div class="toast-content">
            <pre>{{ toast.message }}</pre>
          </div>
          <button class="toast-close">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 480px;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      backdrop-filter: blur(10px);
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
      min-width: 320px;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-error {
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: white;
      border-left: 4px solid #991b1b;
    }

    .toast-success {
      background: linear-gradient(135deg, #16a34a, #22c55e);
      color: white;
      border-left: 4px solid #15803d;
    }

    .toast-warning {
      background: linear-gradient(135deg, #ca8a04, #eab308);
      color: white;
      border-left: 4px solid #a16207;
    }

    .toast-info {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      border-left: 4px solid #1d4ed8;
    }

    .toast-icon {
      font-size: 20px;
      line-height: 1;
      padding-top: 2px;
    }

    .toast-content {
      flex: 1;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .toast-content pre {
      margin: 0;
      font-family: inherit;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .toast-close:hover {
      opacity: 1;
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  closeToast(id: number): void {
    this.toastService.removeToast(id);
  }
}