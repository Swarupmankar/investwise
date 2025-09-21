// src/API/support.api.ts
import { baseApi } from "./baseApi";
import {
  CreateSupportTicketRequest,
  CreateSupportTicketResponse,
  GetAllTicketsResponse,
  GetTicketByIdResponse,
  CreateReplyRequest,
  CreateReplyResponse,
} from "@/types/support/support.types";
import { ENDPOINTS } from "@/constants/apiEndpoints";

export const supportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // create support ticket (form-data)
    createSupportTicket: build.mutation<
      CreateSupportTicketResponse,
      CreateSupportTicketRequest
    >({
      query: ({ file, subject, content }) => {
        const formData = new FormData();
        if (file) formData.append("file", file);
        formData.append("subject", subject);
        formData.append("content", content);

        return {
          url: ENDPOINTS.SUPPORT.SUPPORT_CREATE, // e.g. /users/support/create-ticket
          method: "POST",
          data: formData,
        };
      },
      invalidatesTags: (_res, _err, _arg) => [
        { type: "Support" as const, id: "LIST" },
      ],
    }),

    // get all tickets
    getSupportTickets: build.query<GetAllTicketsResponse, void>({
      query: () => ({
        url: ENDPOINTS.SUPPORT.GET_ALL_TICKETS, // e.g. /users/support/all-tickets
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.tickets.map((t) => ({
                type: "Support" as const,
                id: t.id,
              })),
              { type: "Support" as const, id: "LIST" },
            ]
          : [{ type: "Support" as const, id: "LIST" }],
    }),

    // get single ticket by numeric id
    getTicketById: build.query<GetTicketByIdResponse, number>({
      query: (id) => ({
        url: `/users/support/all-tickets/${id}`, // as requested
        method: "GET",
      }),
      providesTags: (result, _err, id) =>
        result
          ? [{ type: "Support" as const, id }]
          : [{ type: "Support" as const, id }],
    }),

    // create reply to ticket (form-data) -> POST /users/support/ticket/{id}/reply
    createReply: build.mutation<CreateReplyResponse, CreateReplyRequest>({
      query: ({ ticketId, content, file }) => {
        const formData = new FormData();
        formData.append("content", content);
        if (file) formData.append("file", file);

        return {
          url: `/users/support/ticket/${ticketId}/reply`,
          method: "POST",
          data: formData,
        };
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "Support" as const, id: arg.ticketId }, // refresh this ticket
        { type: "Support" as const, id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateSupportTicketMutation,
  useGetSupportTicketsQuery,
  useGetTicketByIdQuery,
  useCreateReplyMutation,
} = supportApi;
