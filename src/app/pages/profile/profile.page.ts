import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SecondaryBottomTabsComponent } from '../../components/secondary-bottom-tabs/secondary-bottom-tabs.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, SecondaryBottomTabsComponent]
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
  // Audio volumes
  masterVolume = 0.5;
  musicVolume = 0.7;
  sfxVolume = 0.8;
  isMuted = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private audioService: AudioService,
    private databaseService: DatabaseService
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
    this.audioService.masterVolume$.subscribe(v => {
      this.masterVolume = v;
    });
    this.audioService.musicVolume$.subscribe(v => {
      this.musicVolume = v;
    });
    this.audioService.sfxVolume$.subscribe(v => {
      this.sfxVolume = v;
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
      
      // Fetch all characters for this user and use that count
      if (typeof currentAccount.id === 'number') {
        this.databaseService.getUserCharacters(currentAccount.id).subscribe({
          next: (chars) => {
            this.characterCount = Array.isArray(chars) ? chars.length : 0;
            this.loading = false;
          },
          error: (err) => {
            console.error('Failed to load user characters for count:', err);
            this.characterCount = 0;
            this.loading = false;
          }
        });
      } else {
        this.characterCount = 0;
        this.loading = false;
      }
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
  setMasterVolume(value: number | { lower: number; upper: number }) {
    const v = typeof value === 'object' ? value.lower : value;
    this.audioService.setMasterVolume(v);
  }

  setMusicVolume(value: number | { lower: number; upper: number }) {
    const v = typeof value === 'object' ? value.lower : value;
    this.audioService.setMusicVolume(v);
  }

  setSfxVolume(value: number | { lower: number; upper: number }) {
    const v = typeof value === 'object' ? value.lower : value;
    this.audioService.setSfxVolume(v);
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

  /**
   * Navigate to theme select page
   */
  goToThemeSelect(): void {
    this.router.navigate(['/theme-select']);
  }

}
