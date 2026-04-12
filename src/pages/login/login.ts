import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../app/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  loginobj: any = {
    username: '',
    password: '',
  };
  loading = false;
  errorMessage = '';
  showError = false;

  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  onlogin() {
    this.errorMessage = '';
    this.showError = false;

    if (!this.loginobj.username || !this.loginobj.password) {
      this.errorMessage = 'Please enter username and password';
      this.showError = true;
      this.hideErrorAfterDelay();
      return;
    }

    this.loading = true;

    this.authService.login(this.loginobj.username, this.loginobj.password).subscribe({
      next: () => {
        this.loading = false;
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/patientdashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Invalid Username or Password';
        this.showError = true;
        this.hideErrorAfterDelay();
      },
    });
  }

  hideErrorAfterDelay() {
    setTimeout(() => {
      this.showError = false;
    }, 4000);
  }
}
