import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
/*
 * ProfilePage component with audio controls
 * Manages volume and mute state through AudioService
 * Provides UI for adjusting audio settings
 */
export class ProfilePage implements OnInit {
  // Form and state variables
  profileForm: FormGroup;
  loading = true;
  error = '';
  editMode = false;
  accountCreatedDate = '';
  characterCount = 0;
  volume = 0.5;
  isMuted = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private audioService: AudioService
  ) {
    // Initialize the form
    this.profileForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      confirmPassword: ['', [Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadAccountData();
    
    // Subscribe to audio service changes
    this.audioService.volume$.subscribe(volume => {
      this.volume = volume;
    });
    
    this.audioService.muted$.subscribe(muted => {
      this.isMuted = muted;
    });
  }

  /**
   * Load the current user's account data
   */
  loadAccountData() {
    this.loading = true;
    this.error = '';
    
    const currentAccount = this.authService.getCurrentAccount();
    if (currentAccount) {
      this.profileForm.patchValue({
        username: currentAccount.username,
        email: currentAccount.email
      });
      
      // Format the date for display
      if (currentAccount.createdAt) {
        const date = new Date(currentAccount.createdAt);
        this.accountCreatedDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      // For now, we'll set a placeholder character count
      // In a real app, you would fetch this from a character service
      this.characterCount = 1;
      
      this.loading = false;
    } else {
      this.error = 'Unable to load account data';
      this.loading = false;
    }
  }

  /**
   * Handle logout
   */
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
      await this.toastController.create({
        message: 'Failed to logout',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      }).then(toast => toast.present());
    }
  }

  /**
   * Set the audio volume
   */
  setVolume(value: number | { lower: number; upper: number }) {
    if (typeof value === 'object') {
      this.audioService.setVolume(value.lower);
    } else {
      this.audioService.setVolume(value);
    }
  }

  /**
   * Toggle mute/unmute
   */
  toggleMute() {
    this.audioService.toggleMute();
  }

  /**
   * Toggle edit mode on/off
   */
  toggleEditMode() {
    this.editMode = !this.editMode;
  }

  /**
   * Update the user's profile
   */
  async updateProfile() {
    if (this.profileForm.valid) {
      const updatedData = {
        username: this.profileForm.get('username')?.value,
        email: this.profileForm.get('email')?.value,
        password: this.profileForm.get('password')?.value
      };

      this.loading = true;
      
      try {
        const response = await this.authService.updateAccount(updatedData).toPromise();
        this.loading = false;
        
        if (response && response.success) {
          this.editMode = false;
          
          // Reset password fields
          this.profileForm.patchValue({
            password: '',
            confirmPassword: ''
          });
          
          // Show success message
          const toast = await this.toastController.create({
            message: 'Profile updated successfully',
            duration: 2000,
            color: 'success',
            cssClass: 'retro-toast'
          });
          toast.present();
        } else {
          // Show error message
          this.error = response?.error || 'Failed to update profile';
          
          const toast = await this.toastController.create({
            message: this.error,
            duration: 3000,
            color: 'danger',
            cssClass: 'retro-toast'
          });
          toast.present();
        }
      } catch (error) {
        this.loading = false;
        this.error = 'An error occurred while updating your profile';
        
        const toast = await this.toastController.create({
          message: this.error,
          duration: 3000,
          color: 'danger',
          cssClass: 'retro-toast'
        });
        toast.present();
      }
    }
  }

  /**
   * Cancel editing and reset form
   */
  cancelEdit() {
    this.editMode = false;
    this.loadAccountData(); // Reset form data
  }

  /**
   * Check if passwords match
   */
  passwordsDoNotMatch(): boolean {
    const password = this.profileForm.get('password')?.value;
    const confirmPassword = this.profileForm.get('confirmPassword')?.value;
    
    return password !== confirmPassword && 
           password !== '' && 
           confirmPassword !== '';
  }


}
