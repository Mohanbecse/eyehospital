import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Navbar } from '../pages/navbar/navbar';
import { LoadingService } from './services/loading.service';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, AsyncPipe, CommonModule, ToastComponent],
  templateUrl: './app.html'
})
export class App {

  showNavbar = false;

  constructor(private router: Router, public loadingService: LoadingService) {

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {

        this.showNavbar = event.url !== '/login';
      });
  }
}