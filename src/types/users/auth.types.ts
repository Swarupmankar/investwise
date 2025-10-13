export interface SendForgetPasswordOtpResponse {
  message: string;
}

export interface ResetPasswordUsingOtpRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ResetPasswordUsingOtpResponse {
  message: string;
}
