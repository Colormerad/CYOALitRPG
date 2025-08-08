import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Account, AuthResponse, LoginRequest, RegisterRequest } from '../models/account.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
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

  constructor(private http: HttpClient) {
    // Check if user is already logged in (from localStorage)
    this.loadStoredAccount();
  }

  register(registerData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, registerData, this.httpOptions);
  }

  login(loginData: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginData, this.httpOptions)
      .pipe(
        map(response => {
          if (response.success && response.account) {
            this.setCurrentAccount(response.account);
          }
          return response;
        })
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
      })
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
