export interface Account {
  id: number;
  email: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  account?: Account;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}
