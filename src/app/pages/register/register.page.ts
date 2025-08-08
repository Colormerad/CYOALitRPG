import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/account.model';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  registerData: RegisterRequest = {
    username: '',
    email: '',
    password: ''
  };

  confirmPassword = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

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

  async onRegister() {
    // Validate input
    if (!this.registerData.username || !this.registerData.email || !this.registerData.password || !this.confirmPassword) {
      this.showToast('Please fill in all fields', 'warning');
      return;
    }
    
    if (!this.authService.isValidUsername(this.registerData.username)) {
      this.showToast('Username must be 3-20 characters', 'warning');
      return;
    }

    if (!this.authService.isValidEmail(this.registerData.email)) {
      this.showToast('Please enter a valid email address', 'warning');
      return;
    }

    if (!this.authService.isValidPassword(this.registerData.password)) {
      this.showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    if (this.registerData.password !== this.confirmPassword) {
      this.showToast('Passwords do not match', 'warning');
      return;
    }
    
    // Start loading state
    this.isLoading = true;
    
    // Check for username and email uniqueness
    this.checkUniqueness();
  }
  
  // Process registration after uniqueness checks
  private async processRegistration() {
    const loading = await this.loadingController.create({
      message: 'Creating your account...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await this.authService.register(this.registerData).toPromise();
      
      if (response?.success) {
        await loading.dismiss();
        await this.showSuccessAlert();
        this.router.navigate(['/login']);
      } else {
        await loading.dismiss();
        this.showToast(response?.error || 'Registration failed', 'danger');
      }

    } catch (error: any) {
      await loading.dismiss();
      console.error('Registration error:', error);
      
      if (error.status === 409) {
        this.showToast('An account with this email already exists', 'warning');
      } else if (error.status === 400) {
        this.showToast('Please check your input', 'warning');
      } else {
        this.showToast('Registration failed. Please try again.', 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
  
  // Check if username and email are unique
  private checkUniqueness() {
    // First check username uniqueness
    this.authService.isUsernameTaken(this.registerData.username).subscribe({
      next: (usernameTaken) => {
        if (usernameTaken) {
          this.isLoading = false;
          this.showToast('Username is already taken. Please choose another.', 'warning');
          return;
        }
        
        // If username is available, check email uniqueness
        this.authService.isEmailTaken(this.registerData.email).subscribe({
          next: (emailTaken) => {
            if (emailTaken) {
              this.isLoading = false;
              this.showToast('Email is already registered. Please use another email or log in.', 'warning');
              return;
            }
            
            // Both username and email are available, proceed with registration
            this.processRegistration();
          },
          error: (error) => {
            console.error('Error checking email:', error);
            // Continue with registration if email check fails
            this.processRegistration();
          }
        });
      },
      error: (error) => {
        console.error('Error checking username:', error);
        // If username check fails, check email
        this.authService.isEmailTaken(this.registerData.email).subscribe({
          next: (emailTaken) => {
            if (emailTaken) {
              this.isLoading = false;
              this.showToast('Email is already registered. Please use another email or log in.', 'warning');
              return;
            }
            
            // Email is available, proceed with registration
            this.processRegistration();
          },
          error: (error) => {
            console.error('Error checking email:', error);
            // Continue with registration if both checks fail
            this.processRegistration();
          }
        });
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private async showSuccessAlert() {
    const alert = await this.alertController.create({
      header: 'Account Created!',
      message: 'Your account has been successfully created. You can now log in and start your adventure!',
      buttons: ['Continue']
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

  // Password strength indicator
  getPasswordStrength(): string {
    const password = this.registerData.password;
    if (!password) return '';
    
    if (password.length < 6) return 'weak';
    if (password.length < 8) return 'medium';
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) return 'strong';
    return 'medium';
  }

  getPasswordStrengthColor(): string {
    const strength = this.getPasswordStrength();
    switch (strength) {
      case 'weak': return 'danger';
      case 'medium': return 'warning';
      case 'strong': return 'success';
      default: return 'medium';
    }
  }
}
