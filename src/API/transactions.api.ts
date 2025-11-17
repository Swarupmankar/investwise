// src/API/transactionsApi.ts
import {
  DepositResponse,
  DepositWalletResponse,
} from "@/types/transctions/deposit.types";
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
        const raw = (res ?? {}) as any;

        // Normalize deposits
        const deposits = Array.isArray(raw.deposits) ? raw.deposits : [];

        // Normalize withdrawals (accept both correct and typo spelling)
        const withdrawals = Array.isArray(raw.withdrawals)
          ? raw.withdrawals
          : Array.isArray(raw.withdrawls)
          ? raw.withdrawls
          : [];

        // Normalize investment settlements if present
        const investmentSettlements = Array.isArray(raw.investmentSettlements)
          ? raw.investmentSettlements
          : [];

        const normalized: GetTransactionsResponse = {
          ...raw,
          deposits,
          withdrawals,
          investmentSettlements,
        };

        return normalized;
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

    // GET DEPOSIT WALLET
    getDepositWallet: build.query<DepositWalletResponse, void>({
      query: () => ({
        url: ENDPOINTS.TRANSACTIONS.DEPOSIT_WALLET, // "/admin/wallet/active"
        method: "GET",
      }),
      // optional: cache tag so you can invalidate if wallet changes
      providesTags: [{ type: "Transactions" as const, id: "ACTIVE" }],
      transformResponse: (res: unknown) => {
        return (res ?? {}) as DepositWalletResponse;
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateDepositTransactionMutation,
  useGetTransactionsQuery,
  useGetDepositWalletQuery,
} = transactionsApi;
