import { baseApi } from "./baseApi";
import type {
  RegisterRequest,
  RegisterResponse,
  VerifyResponse,
} from "@/types/users/register.types";
import { ENDPOINTS } from "@/constants/apiEndpoints";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    registerRequest: build.mutation<
      RegisterResponse,
      Omit<RegisterRequest, "adminId">
    >({
      query: (bodyWithoutAdmin) => ({
        url: ENDPOINTS.REGISTER.AUTH_REGISTER_REQUEST, // e.g. '/v1/users/auth/register-request'
        method: "POST",
        data: { ...bodyWithoutAdmin, adminId: 1 }, // hardcode adminId = 1
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "Users" as const, id: arg.email },
      ],
    }),

    verifyOtp: build.mutation<VerifyResponse, { token: string }>({
      query: ({ token }) => ({
        url: ENDPOINTS.REGISTER.AUTH_VERIFY, // e.g. '/v1/users/auth/verify'
        method: "GET",
        params: { token },
      }),
      invalidatesTags: (_res, _err, _arg) => [
        { type: "Users" as const, id: "VERIFY" },
      ],
    }),

    // Optional: resend OTP using same register endpoint
    resendRegisterRequest: build.mutation<
      RegisterResponse,
      Omit<RegisterRequest, "adminId">
    >({
      query: (bodyWithoutAdmin) => ({
        url: ENDPOINTS.REGISTER.AUTH_REGISTER_REQUEST,
        method: "POST",
        data: { ...bodyWithoutAdmin, adminId: 1 },
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Users" as const, id: arg.email },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useRegisterRequestMutation,
  useVerifyOtpMutation,
  useResendRegisterRequestMutation,
} = authApi;
