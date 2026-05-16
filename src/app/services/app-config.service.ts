import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private config: any;

  constructor() {
    // ✅ LOAD CONFIG SYNCHRONOUSLY BEFORE ANYTHING ELSE
    // Uses native fetch API directly - this runs immediately, before Angular, before services, before interceptors
    const request = new XMLHttpRequest();
    request.open('GET', '/config.json', false); // false = synchronous request
    
    try {
      request.send(null);
      if (request.status === 200) {
        this.config = JSON.parse(request.responseText);
        console.log('✅ Configuration loaded BEFORE application start, API URL:', this.config.apiUrl);
      } else {
        throw new Error(`HTTP ${request.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to load config file, using fallback:', error);
      this.config = {
        apiUrl: 'http://192.168.0.125:7191/api'
      };
    }
  }

  async loadConfig(): Promise<void> {
    // Compatibility method for existing APP_INITIALIZER
    return Promise.resolve();
  }

  get configReady(): Promise<void> {
    return Promise.resolve();
  }

  get apiUrl(): string {
    if (!this.config) {
      console.warn('⚠️ apiUrl accessed before config loaded - returning fallback value');
    }
    return this.config?.apiUrl || 'http://192.168.0.125:7191/api';
  }

  get vaOptions(): string[] {
    return this.config?.vaOptions || ["6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "HM", "PL", "NPL"];
  }

  get showDetailedErrors(): boolean {
    // Default to show detailed errors for localhost environments
    if (this.config?.showDetailedErrors !== undefined) {
      return this.config.showDetailedErrors;
    }
    
    // Fallback automatic detection when not configured
    const hostname = window.location.hostname.toLowerCase();
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' ||
           hostname.startsWith('localhost.') ||
           window.location.host.startsWith('localhost:') ||
           window.location.host.startsWith('127.0.0.1:');
  }
}
