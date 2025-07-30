import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../../services/auth.service';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  loginData: LoginRequest = {
    email: '',
    password: ''
  };

  isLoading = false;
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/select-character']);
    }
  }

  async onLogin() {
    // Validate input
    if (!this.loginData.email || !this.loginData.password) {
      this.showToast('Please fill in all fields', 'warning');
      return;
    }

    if (!this.authService.isValidEmail(this.loginData.email)) {
      this.showToast('Please enter a valid email address', 'warning');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Logging in...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await this.authService.login(this.loginData).toPromise();
      
      if (response?.success) {
        await loading.dismiss();
        this.showToast('Login successful! Welcome back!', 'success');
        this.router.navigate(['/select-character']);
      } else {
        await loading.dismiss();
        this.showToast(response?.error || 'Login failed', 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Login error:', error);
      
      if (error.status === 401) {
        this.showToast('Invalid email or password', 'danger');
      } else if (error.status === 400) {
        this.showToast('Please check your input', 'warning');
      } else {
        this.showToast('Login failed. Please try again.', 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async showForgotPasswordAlert() {
    const alert = await this.alertController.create({
      header: 'Forgot Password',
      message: 'Password recovery feature coming soon! For now, please contact support or create a new account.',
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
