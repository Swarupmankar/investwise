// src/API/transactionsApi.ts
import { DepositResponse } from "@/types/transctions/deposit.types";
import { baseApi } from "./baseApi";
import { ENDPOINTS } from "@/constants/apiEndpoints";
import { GetTransactionsResponse } from "@/types/transctions/transactions.types";

export const transactionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET ALL TRANSACTIONS
    getTransactions: build.query<GetTransactionsResponse, void>({
      query: () => ({
        url: ENDPOINTS.TRANSACTIONS.GET_TRANSACTIONS,
        method: "GET",
      }),
      providesTags: (_res) => [{ type: "Transactions" as const, id: "LIST" }],
      transformResponse: (res: unknown) => {
        return (res ?? {}) as GetTransactionsResponse;
      },
    }),
    // CREATE-TRANSACTION
    createDepositTransaction: build.mutation<DepositResponse, FormData>({
      query: (formData) => ({
        url: ENDPOINTS.TRANSACTIONS.CREATE_DEPOSIT,
        method: "POST",
        data: formData,
      }),

      invalidatesTags: [{ type: "Transactions" as const, id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useCreateDepositTransactionMutation, useGetTransactionsQuery } =
  transactionsApi;
