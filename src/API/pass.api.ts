import { ENDPOINTS } from "@/constants/apiEndpoints";
import type {
  SendForgetPasswordOtpResponse,
  ResetPasswordUsingOtpRequest,
  ResetPasswordUsingOtpResponse,
} from "@/types/users/auth.types";
import { baseApi } from "./baseApi";

export const forgotPasswordApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sendForgetPasswordOtp: build.mutation<
      SendForgetPasswordOtpResponse,
      { email: string }
    >({
      query: ({ email }) => ({
        url: ENDPOINTS.AUTH.SEND_FORGET_PASSWORD_OTP(email),
        method: "GET",
      }),
      transformResponse: (res: unknown) =>
        (res ?? {}) as SendForgetPasswordOtpResponse,
    }),

    resetPasswordUsingOtp: build.mutation<
      ResetPasswordUsingOtpResponse,
      ResetPasswordUsingOtpRequest
    >({
      query: (data) => ({
        url: ENDPOINTS.AUTH.RESET_PASSWORD_USING_OTP,
        method: "POST",
        data,
      }),
      transformResponse: (res: unknown) =>
        (res ?? {}) as ResetPasswordUsingOtpResponse,
    }),
  }),
  overrideExisting: false,
});

export const {
  useSendForgetPasswordOtpMutation,
  useResetPasswordUsingOtpMutation,
} = forgotPasswordApi;
