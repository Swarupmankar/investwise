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

import { useToast } from "@/components/ui/use-toast";

export default function Support() {
  const { toast } = useToast();

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

  // stable preview URL for reply attachment (avoid creating URL on every render)
  const [replyPreviewUrl, setReplyPreviewUrl] = useState<string | null>(null);

  // image modal
  const [modalImage, setModalImage] = useState<string | null>(null);

  // refs
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLenRef = useRef<number>(0);

  // For temporary highlight of the newest message
  const [flashMessageId, setFlashMessageId] = useState<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

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

  // create & cleanup reply previewUrl when replyAttachment changes
  useEffect(() => {
    if (!replyAttachment) {
      // clear preview if attachment cleared
      setReplyPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(replyAttachment);
    setReplyPreviewUrl(url);
    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    };
  }, [replyAttachment]);

  // scroll to bottom after initial load of messages (non-blinking)
  useEffect(() => {
    if (!singleLoading && messagesRef.current) {
      // set prevMessagesLenRef so next change is compared correctly
      prevMessagesLenRef.current = ticketMessages.length;
      // small delay to allow layout to settle
      setTimeout(() => {
        messagesRef.current!.scrollTop = messagesRef.current!.scrollHeight;
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleLoading, selectedTicketNumericId]);

  // smarter auto-scroll: only scroll if user is near bottom already
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) {
      prevMessagesLenRef.current = ticketMessages.length;
      return;
    }

    const prevLen = prevMessagesLenRef.current;
    const curLen = ticketMessages.length;

    const isNearBottom = (threshold = 150) => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      return distanceFromBottom < threshold;
    };

    // initial load handled in other effect; handle appended messages here
    if (curLen > prevLen) {
      // new message appended
      if (isNearBottom(200)) {
        // smooth scroll to last message (prefer last element)
        const lastEl = container.lastElementChild as HTMLElement | null;
        if (lastEl) lastEl.scrollIntoView({ behavior: "smooth", block: "end" });
        else
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
      } else {
        // don't auto-scroll; user reading earlier messages
        // optionally you can show a "New messages" button here
      }

      // flash newest message id
      const newest = ticketMessages[curLen - 1];
      const newId = newest?.id ?? null;
      if (newId !== null) {
        setFlashMessageId(newId);
        if (flashTimeoutRef.current) {
          window.clearTimeout(flashTimeoutRef.current);
        }
        flashTimeoutRef.current = window.setTimeout(() => {
          setFlashMessageId(null);
          flashTimeoutRef.current = null;
        }, 1500);
      }
    }

    prevMessagesLenRef.current = curLen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketMessages.length]);

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

  useEffect(() => {
    // Refetch the current ticket when ticketMessages length changes (new replies added)
    if (selectedTicketNumericId && ticketMessages.length > 0) {
      const hasTempReply = ticketMessages.some((msg) => msg.id < 0); // temp replies have negative IDs

      if (hasTempReply) {
        // If there's a temp reply, refetch after a delay to get the actual server data
        const timer = setTimeout(() => {
          refetchSingle();
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [ticketMessages.length, selectedTicketNumericId, refetchSingle]);

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

  // Helper to detect PDF files (by MIME type and extension fallback)
  const isPdf = (file: File | null | undefined) => {
    if (!file) return false;
    if (file.type === "application/pdf") return true;
    return /\.pdf$/i.test(file.name);
  };

  // CREATE TICKET
  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill subject and description.",
        variant: "destructive",
      });
      return;
    }

    // prevent PDFs from being submitted (extra safety)
    if (attachments.length > 0 && isPdf(attachments[0])) {
      toast({
        title: "Unsupported file",
        description:
          "PDF uploads are not allowed. Please attach an image file.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: { file?: File; subject: string; content: string } = {
        subject: newTicketSubject.trim(),
        content: newTicketMessage.trim(),
      };
      if (attachments.length > 0) payload.file = attachments[0];

      await createTicket(payload).unwrap();

      toast({
        title: "Ticket created",
        description: "Ticket created — switching to new ticket.",
        variant: "default",
      });

      // Clear form first
      setNewTicketSubject("");
      setNewTicketMessage("");
      setAttachments([]);
      setActiveTab("tickets");

      const updatedTickets = await refetchTickets();
      if (
        updatedTickets.data?.tickets &&
        updatedTickets.data.tickets.length > 0
      ) {
        const newestTicket = updatedTickets.data.tickets[0];
        setSelectedTicketNumericId(newestTicket.id);
      }
    } catch (err: any) {
      toast({
        title: "Failed to create ticket",
        description: err?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  // SEND REPLY
  const handleSendReply = async () => {
    if (!selectedTicketNumericId) {
      toast({
        title: "No ticket selected",
        description: "Select a ticket first.",
        variant: "destructive",
      });
      return;
    }
    if (!newMessage.trim() && !replyAttachment) {
      toast({
        title: "Empty reply",
        description: "Please enter a message or attach a file.",
        variant: "destructive",
      });
      return;
    }

    if (isPdf(replyAttachment)) {
      toast({
        title: "Unsupported file",
        description:
          "PDF uploads are not allowed. Please attach an image or .doc/.docx file.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        ticketId: selectedTicketNumericId,
        content: newMessage.trim(),
        file: replyAttachment ?? undefined,
      };

      // call mutation (optimistic update + in-place replace handled in API onQueryStarted)
      await createReply(payload).unwrap();

      toast({
        title: "Reply sent",
        description: "Your reply was sent.",
        variant: "default",
      });

      // clear inputs + revoke preview
      setNewMessage("");
      setReplyAttachment(null);
      setReplyPreviewUrl(null);

      // clear underlying file input element value (if present)
      const fileEl = document.getElementById(
        "reply-file"
      ) as HTMLInputElement | null;
      if (fileEl) fileEl.value = "";

      // smooth scroll to bottom if user near bottom (give optimistic patch time)
      setTimeout(() => {
        const container = messagesRef.current;
        if (!container) return;
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 300) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 120);
    } catch (err: any) {
      toast({
        title: "Failed to send reply",
        description: err?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  // New: handlers that prevent selecting PDFs and show a toast
  const handleTicketFileChange = (files: FileList | null) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return setAttachments([]);

    // filter out PDFs if present
    const nonPdfs = arr.filter((f) => !isPdf(f));
    const pdfs = arr.filter((f) => isPdf(f));

    if (pdfs.length > 0) {
      toast({
        title: "PDF not allowed",
        description:
          "PDF files are not allowed. Please attach an image or a .doc/.docx file.",
        variant: "destructive",
      });
    }

    setAttachments(nonPdfs.slice(0, 1)); // keep only the first non-pdf file (existing behaviour)
  };

  const handleReplyFileChange = (file: File | null) => {
    if (!file) return setReplyAttachment(null);
    if (isPdf(file)) {
      toast({
        title: "PDF not allowed",
        description:
          "PDF files are not allowed. Please attach an image or a .doc/.docx file.",
        variant: "destructive",
      });
      // clear underlying input as well
      const el = document.getElementById(
        "reply-file"
      ) as HTMLInputElement | null;
      if (el) el.value = "";
      return setReplyAttachment(null);
    }

    setReplyAttachment(file);
  };

  // JSX skeletons and markup remain mostly the same but use replyPreviewUrl for the preview image
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
                          {/* <span>{ticket.replies?.length ?? 0} replies</span> */}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Conversation card */}
              <Card className="bg-card border-border flex flex-col h-[70vh]">
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
                            const shouldFlash = flashMessageId === m.id;

                            return (
                              <div
                                key={m.id}
                                data-msg-id={m.id}
                                className={`flex ${
                                  m.isAdmin ? "justify-start" : "justify-end"
                                }`}
                              >
                                <div
                                  className={`max-w-[80%] p-3 rounded-lg transition-transform duration-200 ${
                                    m.isAdmin
                                      ? "bg-muted text-foreground"
                                      : "bg-primary text-primary-foreground"
                                  } ${
                                    shouldFlash
                                      ? "ring-2 ring-accent/60 transform-gpu scale-[1.01]"
                                      : ""
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
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                handleReplyFileChange(
                                  e.currentTarget.files?.[0] ?? null
                                );
                              }}
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
                                    src={replyPreviewUrl ?? ""}
                                    alt="preview"
                                    className="h-10 w-10 object-cover rounded-md border cursor-pointer"
                                    onClick={() =>
                                      replyPreviewUrl &&
                                      setModalImage(replyPreviewUrl)
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
                                    setReplyPreviewUrl(null);
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
                    accept="image/*"
                    onChange={(e) =>
                      handleTicketFileChange(e.target.files || null)
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
              alt="attachment preview"
              className="max-w-full max-h-[90vh] rounded-md object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
