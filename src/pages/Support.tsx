// src/pages/Support.tsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Plus,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Bell,
} from "lucide-react";
import {
  useGetSupportTicketsQuery,
  useCreateSupportTicketMutation,
  useGetTicketByIdQuery,
  useCreateReplyMutation,
} from "@/API/support.api";
import type {
  SupportReply,
  SupportTicket,
} from "@/types/support/support.types";

export default function Support() {
  const [activeTab, setActiveTab] = useState<"tickets" | "new">("tickets");

  // fetch all tickets
  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    isFetching: ticketsFetching,
    isError: ticketsError,
    refetch: refetchTickets,
  } = useGetSupportTicketsQuery();

  // create ticket
  const [createTicket, { isLoading: creating }] =
    useCreateSupportTicketMutation();

  // selected ticket numeric id
  const [selectedTicketNumericId, setSelectedTicketNumericId] = useState<
    number | null
  >(null);

  // fetch selected ticket by numeric id (skip when null)
  const {
    data: selectedTicketData,
    isLoading: singleLoading,
    refetch: refetchSingle,
    isError: singleError,
  } = useGetTicketByIdQuery(selectedTicketNumericId ?? 0, {
    skip: selectedTicketNumericId === null,
  });

  // reply mutation
  const [createReply, { isLoading: replySending }] = useCreateReplyMutation();

  // create ticket form state
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // reply form state
  const [newMessage, setNewMessage] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);

  // image modal
  const [modalImage, setModalImage] = useState<string | null>(null);

  // simple local toast (you can swap to your useToast hook if preferred)
  const [toast, setToast] = useState<null | {
    type: "success" | "error" | "info";
    message: string;
  }>(null);
  const showToast = (
    type: "success" | "error" | "info",
    message: string,
    duration = 4000
  ) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), duration);
  };

  // refs
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // auto-select first ticket when loaded
  useEffect(() => {
    if (
      !ticketsLoading &&
      Array.isArray(ticketsData?.tickets) &&
      ticketsData.tickets.length
    ) {
      setSelectedTicketNumericId((prev) => prev ?? ticketsData.tickets[0].id);
    }
  }, [ticketsLoading, ticketsData]);

  // derived vars
  const tickets: SupportTicket[] = ticketsData?.tickets ?? [];
  const selectedTicket: SupportTicket | null =
    selectedTicketData?.ticket ?? null;
  const ticketMessages: SupportReply[] = selectedTicket?.replies ?? [];

  // scroll to bottom after messages load
  useEffect(() => {
    if (!singleLoading && messagesRef.current) {
      setTimeout(() => {
        messagesRef.current!.scrollTop = messagesRef.current!.scrollHeight;
      }, 50);
    }
  }, [singleLoading, ticketMessages.length, selectedTicketNumericId]);

  // disable body scroll when modal open
  useEffect(() => {
    if (modalImage) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalImage]);

  // close modal on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // helpers
  const formatBytes = (n: number) => {
    if (!n) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(
      Math.floor(Math.log(n) / Math.log(1024)),
      sizes.length - 1
    );
    return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      OPEN: "bg-primary text-primary-foreground",
      CLOSED: "bg-muted text-muted-foreground",
      PENDING: "bg-warning text-white",
    };
    return variants[status.toUpperCase()] ?? "bg-muted text-muted-foreground";
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPEN":
        return <AlertCircle className="h-4 w-4" />;
      case "CLOSED":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // CREATE TICKET
  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      showToast("info", "Please fill subject and description.");
      return;
    }
    try {
      const payload: { file?: File; subject: string; content: string } = {
        subject: newTicketSubject.trim(),
        content: newTicketMessage.trim(),
      };
      if (attachments.length > 0) payload.file = attachments[0];

      await createTicket(payload).unwrap();
      showToast("success", "Ticket created — refreshing list.");
      setNewTicketSubject("");
      setNewTicketMessage("");
      setAttachments([]);
      setActiveTab("tickets");
      refetchTickets();
    } catch (err: any) {
      showToast("error", err?.data?.message ?? "Failed to create ticket");
    }
  };

  // SEND REPLY
  const handleSendReply = async () => {
    if (!selectedTicketNumericId) {
      showToast("info", "Select a ticket first.");
      return;
    }
    if (!newMessage.trim() && !replyAttachment) {
      showToast("info", "Please enter a message or attach a file.");
      return;
    }
    try {
      const payload = {
        ticketId: selectedTicketNumericId,
        content: newMessage.trim(),
        file: replyAttachment ?? undefined,
      };
      await createReply(payload).unwrap();
      showToast("success", "Reply sent.");
      setNewMessage("");
      setReplyAttachment(null);
      refetchSingle();
      refetchTickets();
      setTimeout(() => {
        if (messagesRef.current)
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 150);
    } catch (err: any) {
      showToast("error", err?.data?.message ?? "Failed to send reply");
    }
  };

  // skeletons
  const TicketsListSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg animate-pulse bg-muted/60">
          <div className="h-4 w-3/4 bg-muted rounded mb-2" />
          <div className="h-3 w-1/2 bg-muted rounded mb-1" />
          <div className="h-3 w-1/4 bg-muted rounded" />
        </div>
      ))}
    </div>
  );

  const MessagesSkeleton = () => (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex justify-start">
          <div className="max-w-[80%] p-3 rounded-lg bg-muted/60 animate-pulse">
            <div className="h-3 w-1/3 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  // format timestamp 24h - date + 24h time
  const formatTimestamp24 = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const datePart = d.toLocaleDateString();
      const timePart = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${datePart} ${timePart}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support Center</h1>
        <p className="text-muted-foreground">
          Get help with your account and investments
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
          <TabsTrigger value="new">Create Ticket</TabsTrigger>
        </TabsList>

        {/* Tickets List */}
        <TabsContent value="tickets" className="space-y-6">
          {/* If loading show skeleton two-column layout */}
          {ticketsLoading || ticketsFetching ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground">
                    Your Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TicketsListSkeleton />
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground">
                    Conversation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MessagesSkeleton />
                </CardContent>
              </Card>
            </div>
          ) : ticketsError ? (
            // Error: single full-width error card + refresh button
            <div className="space-y-4">
              <Card className="border-border">
                <CardContent className="p-8 sm:p-10 md:p-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    Unable to load tickets
                  </h3>
                  <p className="text-muted-foreground">
                    There was a problem loading tickets. Try refreshing.
                  </p>
                </CardContent>
              </Card>
              <div className="flex justify-center">
                <Button variant="default" onClick={() => refetchTickets()}>
                  Refresh
                </Button>
              </div>
            </div>
          ) : tickets.length === 0 ? (
            // No tickets: single centered full-width empty card + CTA
            <div className="mx-auto max-w-full">
              <Card className="border-border">
                <CardContent className="p-8 sm:p-10 md:p-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    No tickets
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    You don't have any support tickets yet.
                  </p>
                  <div className="flex justify-center">
                    <Button
                      variant="default"
                      onClick={() => setActiveTab("new")}
                    >
                      Create Ticket
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Normal two-column layout: tickets list + conversation
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground">
                    Your Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicketNumericId(ticket.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedTicketNumericId === ticket.id
                            ? "bg-primary/10 border border-primary"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ticket.status)}
                            <div>
                              <div className="font-medium text-foreground">
                                {ticket.subject}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                #{ticket.ticketId}
                              </div>
                            </div>
                          </div>
                          <Badge className={getStatusBadge(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {ticket.content.length > 120
                            ? `${ticket.content.slice(0, 120)}…`
                            : ticket.content}
                        </p>

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatTimestamp24(ticket.createdAt)}</span>
                          <span>{ticket.replies?.length ?? 0} replies</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Conversation card */}
              <Card className="bg-card border-border flex flex-col h-[60vh]">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <CardTitle className="text-card-foreground">
                        {selectedTicket
                          ? selectedTicket.subject
                          : "No ticket selected"}
                      </CardTitle>
                      {selectedTicket && (
                        <div className="text-xs text-muted-foreground mt-1">
                          #{selectedTicket.ticketId}
                        </div>
                      )}
                    </div>

                    {selectedTicket && (
                      <div>
                        <Badge
                          className={getStatusBadge(selectedTicket.status)}
                        >
                          {selectedTicket.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <div className="flex-1 overflow-hidden">
                  <CardContent className="p-4 h-full flex flex-col">
                    {/* If no tickets show CTA in centre */}
                    {!ticketsLoading && tickets.length === 0 ? (
                      <div className="m-auto max-w-md w-full">
                        <Card className="border-border">
                          <CardContent className="p-8 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                              No chats available
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              You don't have any chats. Create a ticket to start
                              a conversation with support.
                            </p>
                            <div className="flex justify-center">
                              <Button onClick={() => setActiveTab("new")}>
                                Create Ticket
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : selectedTicketNumericId === null ? (
                      <div className="text-sm text-muted-foreground">
                        Select a ticket to view the conversation.
                      </div>
                    ) : singleLoading ? (
                      <MessagesSkeleton />
                    ) : singleError ? (
                      <div className="m-auto max-w-md w-full">
                        <Card className="border-border">
                          <CardContent className="p-8 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                              Unable to load chat
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              Failed to load this conversation. Try refreshing.
                            </p>
                            <div className="flex justify-center">
                              <Button onClick={() => refetchSingle()}>
                                Refresh
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : selectedTicket ? (
                      <div
                        ref={messagesRef}
                        className="flex-1 overflow-auto pr-2 space-y-4"
                      >
                        {ticketMessages.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            No messages yet for this ticket.
                          </div>
                        ) : (
                          ticketMessages.map((m) => {
                            const isImage =
                              !!m.screenshot &&
                              /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(
                                m.screenshot
                              );
                            return (
                              <div
                                key={m.id}
                                className={`flex ${
                                  m.isAdmin ? "justify-start" : "justify-end"
                                }`}
                              >
                                <div
                                  className={`max-w-[80%] p-3 rounded-lg ${
                                    m.isAdmin
                                      ? "bg-muted text-foreground"
                                      : "bg-primary text-primary-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium">
                                      {m.isAdmin ? "Support" : "You"}
                                    </span>
                                    <span className="text-xs opacity-70">
                                      {formatTimestamp24(m.createdAt)}
                                    </span>
                                  </div>

                                  <p className="text-sm">{m.content}</p>

                                  {m.screenshot && (
                                    <div className="mt-2">
                                      {isImage ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setModalImage(m.screenshot)
                                          }
                                          className="inline-block"
                                        >
                                          <img
                                            src={m.screenshot}
                                            alt="attachment"
                                            className="max-w-xs max-h-40 rounded-md object-cover border cursor-pointer"
                                          />
                                        </button>
                                      ) : (
                                        <a
                                          href={m.screenshot}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-sm underline text-primary"
                                        >
                                          View attachment
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No ticket data found.
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Reply footer - stuck to bottom of card */}
                {selectedTicket ? (
                  selectedTicket.status.toUpperCase() === "CLOSED" ? (
                    <div className="border-t border-border p-4">
                      <div className="text-sm text-muted-foreground">
                        This ticket is closed — you cannot reply further.
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border p-4">
                      <div className="space-y-3">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your reply..."
                          className="bg-input border-border"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              id="reply-file"
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) =>
                                setReplyAttachment(
                                  e.currentTarget.files?.[0] ?? null
                                )
                              }
                            />
                            <label
                              htmlFor="reply-file"
                              className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border"
                              title="Attach file"
                            >
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Attach
                              </span>
                            </label>

                            {replyAttachment && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(
                                  replyAttachment.name
                                ) ? (
                                  <img
                                    src={URL.createObjectURL(replyAttachment)}
                                    alt="preview"
                                    className="h-10 w-10 object-cover rounded-md border cursor-pointer"
                                    onClick={() =>
                                      setModalImage(
                                        URL.createObjectURL(replyAttachment)
                                      )
                                    }
                                  />
                                ) : (
                                  <div className="px-2 py-1 rounded bg-muted/30">
                                    {replyAttachment.name}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyAttachment(null);
                                    const el = document.getElementById(
                                      "reply-file"
                                    ) as HTMLInputElement | null;
                                    if (el) el.value = "";
                                  }}
                                  className="inline-flex items-center gap-1 text-destructive"
                                  aria-label="Remove attachment"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="text-xs">Remove</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleSendReply}
                            disabled={replySending}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {replySending ? "Sending..." : "Send Reply"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="border-t border-border p-4">
                    <div className="text-sm text-muted-foreground">
                      Select a ticket to reply.
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Create Ticket */}
        <TabsContent value="new" className="space-y-6">
          <Card className="bg-card border-border max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Plus className="h-5 w-5" />
                Create New Support Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-card-foreground">Subject</Label>
                <Input
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground">Description</Label>
                <Textarea
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  placeholder="Please provide detailed information about your issue..."
                  rows={6}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground">
                  Attach File (Optional)
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    id="ticket-file-upload"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) =>
                      setAttachments(Array.from(e.target.files || []))
                    }
                    className="hidden"
                  />
                  <label
                    htmlFor="ticket-file-upload"
                    className="cursor-pointer inline-block"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload a screenshot or document (single file)
                    </p>
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="rounded-md bg-muted p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {attachments[0].name}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachments([])}
                        className="h-8"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {formatBytes(attachments[0].size)}
                    </div>
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!newTicketSubject || !newTicketMessage || creating}
                onClick={handleCreateTicket}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {creating ? "Creating..." : "Create Ticket"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative max-w-[95%] max-h-[95%]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-full bg-white/90 p-1 shadow"
              onClick={() => setModalImage(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={modalImage}
              alt="attachment"
              className="max-w-full max-h-[90vh] rounded-md object-contain"
            />
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div
          className={`fixed right-4 bottom-6 z-50 max-w-xs rounded-md px-4 py-2 shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-white"
          }`}
          role="status"
        >
          <div className="text-sm">{toast.message}</div>
        </div>
      )}
    </div>
  );
}
