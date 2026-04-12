import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../app/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports:[CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styles: [`
    .navbar {
      background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
      box-shadow: 0 4px 20px rgba(13, 110, 253, 0.15);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 1030;
    }
    
    .navbar-brand {
      font-size: 1.25rem;
      letter-spacing: 0.5px;
      transition: transform 0.2s ease;
    }
    
    .navbar-brand:hover {
      transform: scale(1.02);
    }
    
    .nav-link {
      position: relative;
      padding: 0.5rem 1rem !important;
      margin: 0 0.25rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-weight: 500;
    }
    
    .nav-link:hover {
      background-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }
    
    .nav-link.active {
      background-color: rgba(255, 255, 255, 0.2) !important;
      font-weight: 600;
    }
    
    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 2px;
      background: white;
      border-radius: 2px;
    }
    
    .logout-btn {
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .logout-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .user-badge {
      background: rgba(255,255,255,0.15);
      border-radius: 20px;
      padding: 0.4rem 0.8rem;
      margin-right: 0.75rem;
      font-size: 0.9rem;
    }
    
    @media (max-width: 991px) {
      .navbar-nav {
        padding: 0.75rem 0;
      }
      
      .nav-item {
        margin: 0.25rem 0;
      }
      
      .nav-link {
        padding: 0.75rem 1rem !important;
      }
    }
  `]
})
export class Navbar implements OnInit, OnDestroy {
  isAuthenticated = false;
  currentUser: any = null;
  private authSubscription?: Subscription;

  constructor(
    private router: Router, 
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check immediately from local storage on component init
    this.isAuthenticated = this.authService.isLoggedIn();
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }
    
    // Subscribe for real time updates
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
