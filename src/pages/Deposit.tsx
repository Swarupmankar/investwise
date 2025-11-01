import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Upload,
  QrCode,
  Wallet,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import QRCode from "react-qr-code"; // ← NEW

import {
  useGetTransactionsQuery,
  useCreateDepositTransactionMutation,
  useGetDepositWalletQuery,
} from "@/API/transactions.api";

// --- Helpers for TRON address parsing/validation -----------------------------
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

function extractTronAddress(input: string | undefined | null): string {
  if (!input) return "";
  const s = String(input).trim();

  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s)) return s;

  try {
    const url = new URL(s);
    const pathParts = url.pathname.split("/").filter(Boolean);
    for (const part of pathParts) {
      if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(part)) return part;
    }
    for (const [_, value] of url.searchParams.entries()) {
      if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) return value;
    }
  } catch {}

  return "";
}

function isValidTronAddress(addr: string): boolean {
  return (
    typeof addr === "string" &&
    addr.length === 34 &&
    addr.startsWith("T") &&
    BASE58_REGEX.test(addr)
  );
}

export default function Deposit() {
  const [transactionId, setTransactionId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [amount, setAmount] = useState<string>("");
  const { toast } = useToast();

  // fetch wallet address / link from API
  const {
    data: depositWalletResp,
    isLoading: walletLoading,
    isFetching: walletFetching,
    isError: walletError,
    refetch: refetchWallet,
  } = useGetDepositWalletQuery();

  const walletRaw = depositWalletResp?.address ?? "";
  const tronAddress = useMemo(() => extractTronAddress(walletRaw), [walletRaw]);
  const tronAddressValid = useMemo(
    () => isValidTronAddress(tronAddress),
    [tronAddress]
  );

  const {
    data: transactionsResp,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError: historyError,
    refetch: refetchHistory,
  } = useGetTransactionsQuery();

  const [createDeposit, { isLoading: creating }] =
    useCreateDepositTransactionMutation();

  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    if (!text) {
      toast({
        title: "No address",
        description: "Wallet address not available to copy.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setProofFile(file);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      PENDING: "bg-warning/10 text-warning border-warning/20",
      APPROVED: "bg-success/10 text-success border-success/20",
      REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
      Approved: "bg-success/10 text-success border-success/20",
      Pending: "bg-warning/10 text-warning border-warning/20",
      Rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return variants[status] ?? "bg-muted text-muted-foreground border-border";
  };

  const validate = () => {
    const minAmount = 100;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Amount missing",
        description: "Enter deposit amount.",
        variant: "destructive",
      });
      return false;
    }
    if (Number(amount) < minAmount) {
      toast({
        title: "Amount too small",
        description: `Minimum deposit is $${minAmount}.`,
        variant: "destructive",
      });
      return false;
    }
    if (!transactionId || transactionId.trim() === "") {
      toast({
        title: "Transaction ID missing",
        description: "Enter the transaction hash or ID.",
        variant: "destructive",
      });
      return false;
    }
    if (!proofFile) {
      toast({
        title: "Proof missing",
        description: "Upload a payment screenshot.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const fd = new FormData();
    fd.append("amount", String(Number(amount)));
    fd.append("txId", transactionId.trim());
    if (proofFile) fd.append("file", proofFile);

    try {
      await createDeposit(fd).unwrap();

      toast({
        title: "Deposit submitted",
        description: `Your deposit request of $${Number(
          amount
        ).toLocaleString()} has been submitted.`,
      });

      setAmount("");
      setTransactionId("");
      setProofFile(null);
      refetchHistory();
    } catch (err: any) {
      const serverMessage =
        err?.data?.message || err?.error || err?.message || "Submission failed";
      toast({
        title: "Deposit failed",
        description: String(serverMessage),
        variant: "destructive",
      });
      console.error("createDeposit error:", err);
    }
  };

  const deposits = transactionsResp?.deposits ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deposit Funds</h1>
        <p className="text-muted-foreground">
          Add USDT to your investment account
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit Form */}
        <div className="space-y-6">
          {/* Wallet Information */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Wallet className="h-5 w-5" />
                USDT Deposit Address (TRC20)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR AREA */}
              <div className="flex justify-center">
                <div
                  className={cn(
                    "h-48 w-48 rounded-lg flex items-center justify-center border border-border bg-muted",
                    (walletLoading || walletFetching) && "animate-pulse"
                  )}
                  aria-label={
                    walletError
                      ? "QR unavailable due to error"
                      : tronAddressValid
                      ? "Wallet QR code"
                      : "QR not available"
                  }
                >
                  {walletLoading || walletFetching ? (
                    <Skeleton className="h-40 w-40" />
                  ) : walletError || !tronAddressValid ? (
                    // Blank field (no QR) when invalid or error
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <QrCode className="h-10 w-10 opacity-50" />
                      <span className="text-xs mt-1">QR not available</span>
                    </div>
                  ) : (
                    // Valid address -> live QR code
                    <div className="p-3 bg-white rounded-md">
                      <QRCode
                        value={tronAddress}
                        size={160}
                        level="M"
                        aria-label="TRON deposit QR"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Address field */}
              <div className="space-y-2">
                <Label className="text-card-foreground">Wallet Address</Label>
                <div className="flex gap-2">
                  {walletLoading ? (
                    <div className="flex-1">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : walletError ? (
                    <div className="flex-1">
                      <Input
                        value={"Unable to load address"}
                        readOnly
                        className="bg-input border-border text-foreground text-sm"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          onClick={() => refetchWallet()}
                          variant="ghost"
                          className="border-border"
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={tronAddressValid ? tronAddress : ""}
                        placeholder={
                          tronAddressValid ? "" : "Awaiting valid TRON address…"
                        }
                        readOnly
                        className={cn(
                          "bg-input border-border font-mono text-sm",
                          !tronAddressValid && "text-muted-foreground"
                        )}
                      />
                      <Button
                        onClick={() =>
                          copyToClipboard(tronAddressValid ? tronAddress : "")
                        }
                        variant="outline"
                        className="border-border"
                        disabled={!tronAddressValid}
                        aria-disabled={!tronAddressValid}
                        title={
                          tronAddressValid
                            ? "Copy address"
                            : "No address to copy"
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm text-card-foreground">
                    <p className="font-medium mb-1">Important Instructions:</p>
                    <ul className="space-y-1 text-card-foreground/80">
                      <li>• Only send USDT (TRC20) to this address</li>
                      <li>• Minimum deposit: $100 USDT</li>
                      <li>• Funds will be credited after confirmation</li>
                      <li>• Save your transaction ID for verification</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Proof */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">
                Submit Payment Proof
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-card-foreground">Amount (USD)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount e.g. 1000"
                  className="bg-input border-border"
                  min={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground">Transaction ID</Label>
                <Input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction hash"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground">
                  Upload Payment Screenshot
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {proofFile
                        ? proofFile.name
                        : "Click to upload payment proof"}
                    </p>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className={cn(
                  "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
                  creating && "opacity-60 pointer-events-none"
                )}
                disabled={creating}
              >
                {creating ? "Submitting…" : "Submit Deposit Request"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Deposits */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Recent Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyLoading || historyFetching ? (
                <>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : historyError ? (
                <div className="text-sm text-destructive">
                  Unable to load deposit history.
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No deposit requests yet.
                </div>
              ) : (
                deposits.slice(0, 6).map((deposit) => (
                  <div
                    key={deposit.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        ${Number(deposit.amount).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(deposit.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {deposit.txId}
                      </p>
                    </div>
                    <Badge className={getStatusBadge(deposit.status)}>
                      {deposit.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Deposit History Section (cards) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">
              Deposit History
            </h2>
            <p className="text-muted-foreground">
              Track all your deposit requests and their status
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {historyLoading || historyFetching ? (
            // placeholders while loading
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="card-premium p-6 animate-pulse"
                aria-hidden
              >
                <div className="h-6 bg-muted/30 rounded w-1/3 mb-4" />
                <div className="h-40 bg-muted/20 rounded mb-4" />
                <div className="h-10 bg-muted/15 rounded w-full" />
              </div>
            ))
          ) : deposits.length === 0 ? (
            <div className="col-span-full p-6 text-center text-muted-foreground">
              No deposits found.
            </div>
          ) : (
            deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="card-premium p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-lg">
                          ${Number(deposit.amount).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          USDT Deposit
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusBadge(deposit.status)}>
                      {deposit.status}
                    </Badge>
                  </div>

                  {/* Proof image thumbnail (if available) */}
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <div className="flex items-center justify-center h-40 overflow-hidden rounded">
                      {deposit.proofUrl ? (
                        <img
                          src={deposit.proofUrl}
                          alt={`proof-${deposit.id}`}
                          className="object-cover w-full h-full cursor-pointer"
                          onClick={() =>
                            setOpenImageUrl(deposit.proofUrl ?? null)
                          }
                        />
                      ) : (
                        <div className="text-center">
                          <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">
                            No screenshot
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {deposit.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-warning rounded-full animate-pulse"></div>
                        <p className="text-sm text-warning font-medium">
                          Processing...
                        </p>
                      </div>
                    )}
                    {deposit.status === "APPROVED" && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <p className="text-sm text-success font-medium">
                          Approved & Credited
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Request Date:{" "}
                        {new Date(deposit.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        TXN: {deposit.txId}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Image modal (white background, centered, just image + close) */}
      <Dialog
        open={Boolean(openImageUrl)}
        onOpenChange={(v) => {
          if (!v) setOpenImageUrl(null);
        }}
      >
        <DialogContent className="max-w-5xl p-0 bg-white rounded-lg shadow-lg">
          <div className="relative">
            <DialogClose asChild>
              <button
                className="absolute top-3 right-3 z-40 inline-flex items-center justify-center rounded-full p-1 bg-white border border-border shadow-sm"
                aria-label="Close image"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
            </DialogClose>

            <div className="flex items-center justify-center min-h-[60vh] max-h-[90vh] overflow-auto bg-white rounded-b-lg">
              {openImageUrl && (
                <img
                  src={openImageUrl}
                  alt="proof"
                  className="max-h-[88vh] max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
