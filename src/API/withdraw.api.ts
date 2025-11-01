import {
  WithdrawRequest,
  WithdrawOTPResponse,
  WithdrawTransactionResponse,
  UploadWithdrawProofRequest,
  UploadWithdrawProofResponse,
} from "@/types/transctions/withdraw.types";
import { baseApi } from "./baseApi";
import { ENDPOINTS } from "@/constants/apiEndpoints";

export const withdrawApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    //-- SEND WITHDRAW OTP --//
    sendWithdrawOTP: build.mutation<WithdrawOTPResponse, void>({
      query: () => ({
        url: ENDPOINTS.WITHDRAW.SEND_OTP,
        method: "GET",
      }),
      invalidatesTags: [{ type: "Transactions", id: "WITHDRAW_OTP" }],
    }),

    //-- CREATE WITHDRAW TRANSACTION --//
    createWithdrawTransaction: build.mutation<
      WithdrawTransactionResponse,
      WithdrawRequest
    >({
      query: (data) => ({
        url: ENDPOINTS.WITHDRAW.CREATE_TRANSACTION,
        method: "POST",
        data,
      }),
      invalidatesTags: [
        { type: "Transactions", id: "LIST" },
        { type: "Transactions", id: "BALANCE" },
      ],
    }),

    //-- UPLOAD WITHDRAW PROOF --//
    uploadWithdrawProof: build.mutation<
      UploadWithdrawProofResponse,
      UploadWithdrawProofRequest
    >({
      query: (data) => {
        const formData = new FormData();
        const txIdNum = Number(data.transactionId);
        formData.append("transactionId", String(txIdNum));
        formData.append("file", data.screenshot);

        return {
          url: ENDPOINTS.WITHDRAW.UPLOAD_PROOF,
          method: "PATCH",
          data: formData,
        };
      },
      invalidatesTags: [
        { type: "Transactions", id: "LIST" },
        { type: "Transactions", id: "PROOF" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useSendWithdrawOTPMutation,
  useCreateWithdrawTransactionMutation,
  useUploadWithdrawProofMutation,
} = withdrawApi;
