import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { AudioService } from '../../services/audio.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/account.model';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
/*
 * LoginPage component with continuous background music playback
 * Handles audio service initialization and volume/mute controls
 */
export class LoginPage implements OnInit, AfterViewInit {
  @ViewChild('backgroundMusic') backgroundMusic!: ElementRef<HTMLAudioElement>;
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
    private toastController: ToastController,
    private audioService: AudioService
  ) {}

  ngOnInit() {
    // Initialize the page
  }

  ngAfterViewInit() {
    this.initializeMusic();
  }

  ngOnDestroy() {
    // Stop the music when leaving the page
    if (this.backgroundMusic) {
      this.backgroundMusic.nativeElement.pause();
    }
  }

  private initializeMusic() {
    if (this.backgroundMusic) {
      console.log('Audio element found');
      
      // Set up continuous looping
      this.backgroundMusic.nativeElement.loop = true;
      
      // Subscribe to volume changes
      this.audioService.volume$.subscribe(volume => {
        this.backgroundMusic.nativeElement.volume = volume;
      });
      
      // Subscribe to mute changes
      this.audioService.muted$.subscribe(muted => {
        this.backgroundMusic.nativeElement.muted = muted;
      });
      
      // Add event listeners for debugging and loop handling
      this.backgroundMusic.nativeElement.addEventListener('canplay', () => {
        console.log('Audio can play');
      });
      
      this.backgroundMusic.nativeElement.addEventListener('error', (event: Event) => {
        console.error('Audio error:', (event.target as HTMLAudioElement).error);
        // Attempt to restart playback on error
        this.backgroundMusic.nativeElement.play().catch(error => {
          console.error('Failed to restart audio:', error);
        });
      });
      
      this.backgroundMusic.nativeElement.addEventListener('loadeddata', () => {
        console.log('Audio loaded data');
      });
      
      this.backgroundMusic.nativeElement.addEventListener('ended', () => {
        console.log('Audio ended - restarting');
        // Restart playback if it ends
        this.backgroundMusic.nativeElement.play().catch(error => {
          console.error('Error restarting audio:', error);
        });
      });
      
      try {
        // Start playback
        this.backgroundMusic.nativeElement.play().then(() => {
          console.log('Audio started playing');
        }).catch(error => {
          console.error('Error playing background music:', error);
          // Attempt to restart if initial play fails
          setTimeout(() => {
            this.backgroundMusic.nativeElement.play().catch(error => {
              console.error('Failed to restart audio:', error);
            });
          }, 1000);
        });
      } catch (error) {
        console.error('Error playing background music:', error);
        // Attempt to restart if initial play fails
        setTimeout(() => {
          this.backgroundMusic.nativeElement.play().catch(error => {
            console.error('Failed to restart audio:', error);
          });
        }, 1000);
      }
    } else {
      console.error('Audio element not found');
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
