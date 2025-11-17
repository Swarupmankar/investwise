// src/API/support.api.ts
import { baseApi } from "./baseApi";
import {
  CreateSupportTicketRequest,
  CreateSupportTicketResponse,
  GetAllTicketsResponse,
  GetTicketByIdResponse,
  CreateReplyRequest,
  CreateReplyResponse,
  SupportReply,
} from "@/types/support/support.types";
import { ENDPOINTS } from "@/constants/apiEndpoints";

export const supportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
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
          url: ENDPOINTS.SUPPORT.SUPPORT_CREATE,
          method: "POST",
          data: formData,
        };
      },
      invalidatesTags: (_res, _err, _arg) => [
        { type: "Support" as const, id: "LIST" },
      ],
    }),

    getSupportTickets: build.query<GetAllTicketsResponse, void>({
      query: () => ({
        url: ENDPOINTS.SUPPORT.GET_ALL_TICKETS,
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

    getTicketById: build.query<GetTicketByIdResponse, number>({
      query: (id) => ({
        url: `/users/support/all-tickets/${id}`,
        method: "GET",
      }),
      providesTags: (result, _err, id) =>
        result
          ? [{ type: "Support" as const, id }]
          : [{ type: "Support" as const, id }],
    }),

    createReply: build.mutation<CreateReplyResponse, CreateReplyRequest>({
      query: ({ ticketId, content, file }) => {
        const finalContent =
          content && content.trim() !== ""
            ? content
            : file
            ? "[image]"
            : content ?? "";
        const formData = new FormData();
        formData.append("content", finalContent);
        if (file) formData.append("file", file);

        return {
          url: `/users/support/ticket/${ticketId}/reply`,
          method: "POST",
          data: formData,
        };
      },

      async onQueryStarted(
        { ticketId, content, file },
        { dispatch, queryFulfilled }
      ) {
        const tmpId = -Date.now();
        const nowIso = new Date().toISOString();
        const optimisticContent =
          content && content.trim() !== ""
            ? content
            : file
            ? "[image]"
            : content ?? "";
        const tempScreenshot = file ? URL.createObjectURL(file) : null;

        const tempReply: SupportReply = {
          id: tmpId,
          content: optimisticContent,
          screenshot: tempScreenshot,
          isAdmin: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        const undoTicket = dispatch(
          supportApi.util.updateQueryData(
            "getTicketById",
            ticketId,
            (draft: any) => {
              if (!draft || !draft.ticket) return;
              if (!Array.isArray(draft.ticket.replies))
                draft.ticket.replies = [];
              draft.ticket.replies.push(tempReply as any);
            }
          )
        );

        const undoList = dispatch(
          supportApi.util.updateQueryData(
            "getSupportTickets",
            undefined,
            (draft: any) => {
              if (!draft || !Array.isArray(draft.tickets)) return;
              const t = draft.tickets.find((tt: any) => tt.id === ticketId);
              if (!t) return;
              t.replies = t.replies ?? [];
              t.replies.push({
                id: tmpId,
                content: optimisticContent,
                screenshot: tempScreenshot,
                isAdmin: false,
                createdAt: nowIso,
              } as any);
            }
          )
        );

        try {
          const { data } = await queryFulfilled;

          const serverRaw: any = (data as any)?.data ?? (data as any) ?? null;

          if (!serverRaw) {
            return;
          }

          let serverScreenshot = null;

          if (
            serverRaw.screenshot &&
            typeof serverRaw.screenshot === "string"
          ) {
            serverScreenshot = serverRaw.screenshot;
          } else if (
            serverRaw.fileUrl &&
            typeof serverRaw.fileUrl === "string"
          ) {
            serverScreenshot = serverRaw.fileUrl;
          } else if (serverRaw.url && typeof serverRaw.url === "string") {
            serverScreenshot = serverRaw.url;
          } else if (
            serverRaw.attachmentUrl &&
            typeof serverRaw.attachmentUrl === "string"
          ) {
            serverScreenshot = serverRaw.attachmentUrl;
          } else if (serverRaw.path && typeof serverRaw.path === "string") {
            serverScreenshot = serverRaw.path;
          } else if (serverRaw.attachment && serverRaw.attachment.url) {
            serverScreenshot = serverRaw.attachment.url;
          } else if (serverRaw.file && serverRaw.file.url) {
            serverScreenshot = serverRaw.file.url;
          }

          if (serverScreenshot) {
            if (serverScreenshot.startsWith("//")) {
              serverScreenshot = window.location.protocol + serverScreenshot;
            } else if (serverScreenshot.startsWith("/")) {
              serverScreenshot = window.location.origin + serverScreenshot;
            } else if (
              !serverScreenshot.startsWith("http") &&
              !serverScreenshot.startsWith("blob:")
            ) {
              serverScreenshot =
                window.location.origin +
                "/" +
                serverScreenshot.replace(/^\//, "");
            }
          }

          const serverReply = {
            id: serverRaw.id || tmpId,
            content: serverRaw.content || optimisticContent,
            screenshot: serverScreenshot,
            isAdmin: serverRaw.isAdmin || false,
            createdAt: serverRaw.createdAt || nowIso,
            updatedAt: serverRaw.updatedAt || nowIso,
          };

          dispatch(
            supportApi.util.updateQueryData(
              "getTicketById",
              ticketId,
              (draft: any) => {
                if (!draft?.ticket?.replies) return;

                const idx = draft.ticket.replies.findIndex(
                  (r: any) => r.id === tmpId
                );

                if (idx !== -1) {
                  draft.ticket.replies[idx] = serverReply;
                } else {
                  draft.ticket.replies.push(serverReply);
                }
              }
            )
          );

          dispatch(
            supportApi.util.updateQueryData(
              "getSupportTickets",
              undefined,
              (draft: any) => {
                if (!draft?.tickets) return;
                const ticket = draft.tickets.find(
                  (t: any) => t.id === ticketId
                );
                if (!ticket) return;

                ticket.replies = ticket.replies ?? [];
                const idx = ticket.replies.findIndex(
                  (r: any) => r.id === tmpId
                );

                if (idx !== -1) {
                  ticket.replies[idx] = serverReply;
                } else {
                  ticket.replies.push(serverReply);
                }
              }
            )
          );

          if (tempScreenshot && serverScreenshot) {
            try {
              URL.revokeObjectURL(tempScreenshot);
            } catch {}
          }
        } catch (err) {
          try {
            (undoTicket as any)?.undo?.();
          } catch {}
          try {
            (undoList as any)?.undo?.();
          } catch {}

          if (tempScreenshot) {
            try {
              URL.revokeObjectURL(tempScreenshot);
            } catch {}
          }
        }
      },
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
