export const ENDPOINTS = {
  REGISTER: {
    AUTH_REGISTER_REQUEST: "/users/auth/register-request",
    AUTH_VERIFY: "/users/auth/verify",
  },

  USERS: {
    USER_PROFILE: "/users/user-profile/profile",
    CHANGE_PASSWORD: "/users/user-profile/change-password",
    KYC_UPLOAD: "/users/user-profile/upload-kyc-docs",
    KYC_STATUS: "/users/user-profile/kyc-status",
  },

  AUTH: {
    SEND_FORGET_PASSWORD_OTP: (email: string) =>
      `/users/auth/send-forget-password-otp?email=${encodeURIComponent(email)}`,
    RESET_PASSWORD_USING_OTP: `/users/auth/reset-password-using-otp`,
  },

  SUPPORT: {
    SUPPORT_CREATE: "/users/support/create-ticket",
    GET_ALL_TICKETS: "/users/support/all-tickets",
    GET_TICKET_ID: "/users/support/all-tickets",
  },

  REFERRAL: {
    STATS: "users/referral/stats",
    COMMISSION_HISTORY: "/users/referral/commssion-history",
  },

  INVESTMENT: {
    PORTFOLIO: "/users/investment/investment-portfolio",
    ALL_INVESTMENTS: "/users/investment/all-investments",
    CREATE: "/users/investment/create-investment",
  },

  NOTIFICATIONS: {
    ALL: "/users/notifications/all",
    READ: (id: number | string) => `/users/notifications/${id}/read`,
  },

  REPORTS: {
    LIST: "/users/reports",
  },

  TRANSACTIONS: {
    CREATE_DEPOSIT: "/users/transactions/create-deposit-transaction",
    DEPOSIT_WALLET: "/admin/wallet/active",
    GET_TRANSACTIONS: "/users/transactions",
  },

  ONBOARDING: {
    SAVE_ANSWERS: "/users/questions/save-answers",
    GET_USER_ANSWERS: "/users/questions/get-user-answers",
    IS_ANSWERED: "/users/questions/isAnswered",
  },

  WITHDRAW: {
    SEND_OTP: "/users/transactions/send-withdraw-otp",
    CREATE_TRANSACTION: "/users/transactions/create-withdraw-transaction",
    UPLOAD_PROOF: "/users/transactions/upload-withdraw-proof",
  },
};
