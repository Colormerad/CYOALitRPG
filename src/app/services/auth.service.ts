import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

import { Account, AuthResponse, LoginRequest, RegisterRequest } from '../models/account.model';
import { DatabaseService } from './database.service';
import { LoadingService } from './loading.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBase}/auth`;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  // Current user state
  private currentAccountSubject = new BehaviorSubject<Account | null>(null);
  public currentAccount$ = this.currentAccountSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private db: DatabaseService, private loading: LoadingService) {
    // Check if user is already logged in (from localStorage)
    this.loadStoredAccount();
  }

  register(registerData: RegisterRequest): Observable<AuthResponse> {
    this.loading.show();
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, registerData, this.httpOptions)
      .pipe(
        finalize(() => this.loading.hide())
      );
  }

  login(loginData: LoginRequest): Observable<AuthResponse> {
    this.loading.show();
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginData, this.httpOptions)
      .pipe(
        map(response => {
          if (response.success && response.account) {
            this.setCurrentAccount(response.account);
          }
          return response;
        }),
        finalize(() => this.loading.hide())
      );
  }

  logout(): void {
    this.clearCurrentAccount();
    this.clearAllLocalCaches();
  }
  
  /**
   * Clear all local caches and storage
   * This ensures no sensitive data remains after logout
   */
  private clearAllLocalCaches(): void {
    // Clear localStorage completely
    localStorage.clear();
    
    // Clear sessionStorage if needed
    sessionStorage.clear();
    
    // Clear any other caches or stored data if applicable
    // For example, if using IndexedDB or other storage mechanisms
    // You would add that clearing logic here
  }

  getCurrentAccount(): Account | null {
    return this.currentAccountSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  private setCurrentAccount(account: Account): void {
    // Store in localStorage for persistence
    localStorage.setItem('currentAccount', JSON.stringify(account));
    
    // Update observables
    this.currentAccountSubject.next(account);
    this.isAuthenticatedSubject.next(true);

    // Prime character cache for this user on login
    if (account?.id != null) {
      this.db.getUserCharacters(account.id).subscribe({
        next: (chars) => {
          try {
            localStorage.setItem(`user_characters_${account.id}`, JSON.stringify(chars || []));
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[AuthService] Failed to cache user characters:', e);
          }
        },
        error: (err) => {
          // eslint-disable-next-line no-console
          console.warn('[AuthService] Failed to prefetch user characters on login:', err);
        }
      });
    }
  }

  private clearCurrentAccount(): void {
    // Remove from localStorage
    localStorage.removeItem('currentAccount');
    
    // Update observables
    this.currentAccountSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private loadStoredAccount(): void {
    const storedAccount = localStorage.getItem('currentAccount');
    if (storedAccount) {
      try {
        const account = JSON.parse(storedAccount);
        this.currentAccountSubject.next(account);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Error parsing stored account:', error);
        localStorage.removeItem('currentAccount');
      }
    }
  }

  // Utility methods for validation
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPassword(password: string): boolean {
    return password.length >= 6;
  }
  
  // Interface for updating account information
  updateAccount(updates: {
    username?: string;
    email?: string;
    password?: string;
  }): Observable<AuthResponse> {
    const currentAccount = this.getCurrentAccount();
    
    if (!currentAccount) {
      return new Observable<AuthResponse>(observer => {
        observer.next({
          success: false,
          message: 'No account found',
          error: 'Not authenticated'
        });
        observer.complete();
      });
    }
    
    // Call the real backend API endpoint
    // Remove '/auth' from the path as the backend expects /api/accounts/:id
    const accountsApiUrl = this.apiUrl.replace('/auth', '');
    this.loading.show();
    return this.http.put<AuthResponse>(
      `${accountsApiUrl}/accounts/${currentAccount.id}`, 
      updates, 
      this.httpOptions
    ).pipe(
      map(response => {
        if (response.success && response.account) {
          // Update the stored account with the new values
          this.setCurrentAccount(response.account);
        }
        return response;
      }),
      finalize(() => this.loading.hide())
    );
  }
  
  // Validate username
  isValidUsername(username: string): boolean {
    return username.length >= 3 && username.length <= 20;
  }
  
  // Check if username is already taken
  isUsernameTaken(username: string): Observable<boolean> {
    // In a real app, this would call an API endpoint to check the database
    // For now, we'll simulate a check against existing usernames
    return new Observable<boolean>(observer => {
      setTimeout(() => {
        // Get all accounts from localStorage (in a real app, this would be a database query)
        const storedAccounts = localStorage.getItem('accounts');
        const accounts: Account[] = storedAccounts ? JSON.parse(storedAccounts) : [];
        
        // Check if username exists in any account
        const usernameTaken = accounts.some(account => 
          account.username && account.username.toLowerCase() === username.toLowerCase()
        );
        
        observer.next(usernameTaken);
        observer.complete();
      }, 500); // Simulate network delay
    });
  }
  
  // Check if email is already taken
  isEmailTaken(email: string): Observable<boolean> {
    // In a real app, this would call an API endpoint to check the database
    // For now, we'll simulate a check against existing emails
    return new Observable<boolean>(observer => {
      setTimeout(() => {
        // Get all accounts from localStorage (in a real app, this would be a database query)
        const storedAccounts = localStorage.getItem('accounts');
        const accounts: Account[] = storedAccounts ? JSON.parse(storedAccounts) : [];
        
        // Check if email exists in any account
        const emailTaken = accounts.some(account => 
          account.email && account.email.toLowerCase() === email.toLowerCase()
        );
        
        observer.next(emailTaken);
        observer.complete();
      }, 500); // Simulate network delay
    });
  }
}
