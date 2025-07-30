import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';
import { AuthService, Account } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class ProfilePage implements OnInit {
  // Form and state variables
  profileForm: FormGroup;
  loading = true;
  error = '';
  editMode = false;
  accountCreatedDate = '';
  characterCount = 0;
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {
    // Initialize the form
    this.profileForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      confirmPassword: ['']
    });
  }

  ngOnInit() {
    this.loadAccountData();
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
        username: currentAccount.username || 'Player', // Default if not set
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
   * Toggle edit mode on/off
   */
  toggleEditMode() {
    this.editMode = true;
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
   * Update the user's profile
   */
  async updateProfile() {
    if (this.profileForm.invalid || this.passwordsDoNotMatch()) {
      return;
    }
    
    this.loading = true;
    
    // Get form values
    const formValues = this.profileForm.value;
    
    // Prepare update data (only include fields that have values)
    const updateData: any = {};
    
    if (formValues.username) {
      updateData.username = formValues.username;
    }
    
    if (formValues.email) {
      updateData.email = formValues.email;
    }
    
    if (formValues.password) {
      updateData.password = formValues.password;
    }
    
    // Call the auth service to update the account
    this.authService.updateAccount(updateData).subscribe(
      async (response) => {
        this.loading = false;
        
        if (response.success) {
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
          this.error = response.error || 'Failed to update profile';
          
          const toast = await this.toastController.create({
            message: this.error,
            duration: 3000,
            color: 'danger',
            cssClass: 'retro-toast'
          });
          toast.present();
        }
      },
      async (error) => {
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
    );
  }

  /**
   * Log the user out
   */
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
