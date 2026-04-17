export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;

  // YENI
  refreshToken: string;

  // YENI
  refreshTokenExpiresAt: string;

  user: CurrentUser;
  mustChangePassword: boolean;
}

export interface CurrentUser {
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  fullName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  isValid: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// YENI
export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

// YENI
export interface RevokeRefreshTokenRequest {
  refreshToken: string;
}