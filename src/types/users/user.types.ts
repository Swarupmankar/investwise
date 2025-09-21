export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
export type KycStatus = "PENDING" | "APPROVED" | "REJECTED" | string;

export interface UserProfile {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly kycStatus: KycStatus;
  readonly accountStatus: AccountStatus;
}
