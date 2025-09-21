// src/types/support/support.types.ts

export interface CreateSupportTicketRequest {
  // file is optional (single file)
  file?: File;
  subject: string;
  content: string;
}

export interface CreateSupportTicketResponse {
  message?: string;
  data?: SupportTicket;
}

export type SupportReply = {
  id: number;
  content: string;
  screenshot?: string | null; // server returns URL or null
  isAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
};

export interface SupportTicket {
  id: number; // numeric id from API (used to fetch /users/support/all-tickets/:id)
  ticketId: string; // e.g. "TIK-55238880"
  subject: string;
  content: string;
  status: "OPEN" | "CLOSED" | "PENDING" | string;
  createdAt: string;
  updatedAt?: string;
  screenshot?: string | null;
  replies?: SupportReply[];
}

export type GetAllTicketsResponse = {
  tickets: SupportTicket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type GetTicketByIdResponse = {
  message: string;
  ticket: SupportTicket;
};

/** Reply creation types **/
export type CreateReplyRequest = {
  ticketId: number; // numeric id
  content: string;
  file?: File;
};

export type CreateReplyResponse = {
  message: string;
  data?: SupportReply;
};
