export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  adminId?: number; // will be added by the API layer (hardcoded = 1)
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface VerifyResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface PendingRegistration {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password?: string;
}
