import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WithdrawalVerificationProps {
  withdrawal: {
    id: string;
    amount: number;
    status: string;
    verificationAttempts?: number;
    screenshotUrl?: string;
    adminProofUrl?: string;
    verificationDeadline?: string;
    isBlocked?: boolean;
  };
  onUploadScreenshot: (file: File) => Promise<{ success: boolean }>;
  onVerificationComplete?: (
    action: "client_uploaded" | "admin_approved" | "approve_final" | "reject"
  ) => Promise<{ success: boolean }>;
  // total count for ADMIN_PROOF_UPLOADED without client proof
  pendingUploadsCount: number;
}

const MAX_PENDING_UPLOADS = 3;
const MIN_UPLOAD_DURATION_MS = 2500;

// Small CSS spinner used where icons are not sufficient
const Spinner = ({ className = "w-6 h-6" }: { className?: string }) => (
  <div
    className={cn(
      "rounded-full border-2 border-t-transparent animate-spin inline-block",
      className
    )}
    style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "currentColor" }}
    role="status"
    aria-label="loading"
  />
);

const WithdrawalVerification = ({
  withdrawal,
  onUploadScreenshot,
  onVerificationComplete,
  pendingUploadsCount,
}: WithdrawalVerificationProps) => {
  const status = (withdrawal?.status || "").toUpperCase();

  // Use refs for state that should NOT be reset by parent re-renders
  const isUploadingRef = useRef(false);
  const uploadProgressRef = useRef(0);

  // Local state for UI updates
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string>(
    withdrawal.screenshotUrl || ""
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasServerUpload, setHasServerUpload] = useState<boolean>(() => {
    const serverHasUrl = Boolean(withdrawal?.screenshotUrl);
    const statusIndicatesClientUploaded = [
      "REVIEW",
      "APPROVED",
      "COMPLETE",
    ].includes((withdrawal?.status || "").toUpperCase());
    return serverHasUrl || statusIndicatesClientUploaded;
  });

  const [adminImgError, setAdminImgError] = useState(false);
  const [adminImgLoading, setAdminImgLoading] = useState(false);
  const [isAdminProofOpen, setIsAdminProofOpen] = useState(false);

  useEffect(() => {
    isUploadingRef.current = isUploading;
    uploadProgressRef.current = uploadProgress;
  }, [isUploading, uploadProgress]);

  useEffect(() => {
    if (!isUploadingRef.current) {
      if (withdrawal.screenshotUrl) {
        setUploadedImage((prev) => prev || withdrawal.screenshotUrl!);
      }
      const serverHasUrl = Boolean(withdrawal?.screenshotUrl);
      const statusIndicatesClientUploaded = [
        "REVIEW",
        "APPROVED",
        "COMPLETE",
      ].includes(status);
      setHasServerUpload(serverHasUrl || statusIndicatesClientUploaded);
    }
  }, [withdrawal.screenshotUrl, status]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Enhanced upload with progress animation and minimum duration
  const handleUpload = async () => {
    if (!selectedFile || hasServerUpload || isUploadingRef.current) return;

    console.log("🔄 Starting upload...");

    // Set both ref and state
    isUploadingRef.current = true;
    setIsUploading(true);
    uploadProgressRef.current = 0;
    setUploadProgress(0);

    const startTime = Date.now();
    let active = true;

    console.log("🔄 isUploading set to:", true);

    // Progress animation
    const progressId = window.setInterval(() => {
      if (!active) return;
      const newProgress = Math.min(
        95,
        uploadProgressRef.current + Math.random() * 10 + 5
      );
      uploadProgressRef.current = newProgress;
      setUploadProgress(newProgress);
    }, 200);

    try {
      console.log("🔄 Calling onUploadScreenshot...");
      const res = await onUploadScreenshot(selectedFile);
      const elapsed = Date.now() - startTime;

      active = false;
      clearInterval(progressId);

      // Set to 100% immediately after upload completes
      uploadProgressRef.current = 100;
      setUploadProgress(100);
      console.log("✅ Upload completed, setting progress to 100%");

      // Ensure minimum 2.5 seconds loading time
      const remainingTime = Math.max(0, MIN_UPLOAD_DURATION_MS - elapsed);
      console.log(`⏰ Remaining time to wait: ${remainingTime}ms`);

      if (remainingTime > 0) {
        await new Promise((r) => setTimeout(r, remainingTime));
      }

      if (res?.success) {
        console.log("✅ Upload successful, updating state");
        setHasServerUpload(true);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("❌ Upload failed:", error);
      active = false;
      clearInterval(progressId);
      uploadProgressRef.current = 0;
      setUploadProgress(0);
    } finally {
      // Always ensure we show loader for at least 2.5 seconds
      const totalElapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_UPLOAD_DURATION_MS - totalElapsed);

      console.log(`⏰ Final remaining time: ${remainingTime}ms`);

      if (remainingTime > 0) {
        await new Promise((r) => setTimeout(r, remainingTime));
      }

      console.log("🔚 Setting isUploading to false");
      isUploadingRef.current = false;
      setIsUploading(false);
      uploadProgressRef.current = 0;
      setUploadProgress(0);
    }
  };

  const handleVerificationComplete = async () => {
    if (onVerificationComplete) {
      await onVerificationComplete("client_uploaded");
    }
  };

  const getStatusIcon = () => {
    if (status === "APPROVED")
      return <CheckCircle className="w-5 h-5 text-success" />;
    if (status === "REVIEW") return <Clock className="w-5 h-5 text-warning" />;
    if (status === "ADMIN_PROOF_UPLOADED")
      return <Shield className="w-5 h-5" />;
    if (status === "PENDING")
      return <Clock className="w-5 h-5 text-muted-foreground" />;
    if (status === "REJECTED")
      return <XCircle className="w-5 h-5 text-destructive" />;
    return <Upload className="w-5 h-5" />;
  };

  const getStatusBadge = () => {
    switch (status) {
      case "APPROVED":
        return "bg-success/10 text-success border-success/20";
      case "REVIEW":
      case "ADMIN_PROOF_UPLOADED":
        return "bg-warning/10 text-warning border-warning/20";
      case "PENDING":
        return "bg-muted/10 text-muted-foreground border-muted/20";
      case "REJECTED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const statusLabel = () => {
    switch (status) {
      case "APPROVED":
        return "Completed";
      case "REVIEW":
        return "Under Admin Review";
      case "ADMIN_PROOF_UPLOADED":
        return "Admin Proof Uploaded";
      case "PENDING":
        return "Awaiting Admin Approval";
      case "REJECTED":
        return "Rejected";
      default:
        return "Pending";
    }
  };

  const progressValue = () => {
    if (isUploading) return Math.round(uploadProgress);
    switch (status) {
      case "APPROVED":
        return 100;
      case "REVIEW":
        return 80;
      case "ADMIN_PROOF_UPLOADED":
        return uploadedImage ? 60 : 40;
      case "PENDING":
        return 0;
      case "REJECTED":
        return 0;
      default:
        return 0;
    }
  };

  // Counter display — only for ADMIN_PROOF_UPLOADED
  const showPendingStrip = status === "ADMIN_PROOF_UPLOADED";
  const safeCount = Math.max(
    0,
    Math.min(pendingUploadsCount, MAX_PENDING_UPLOADS)
  );
  const remaining = Math.max(0, MAX_PENDING_UPLOADS - safeCount);
  const stripText = `(${safeCount}/${MAX_PENDING_UPLOADS}) ${remaining} remaining`;

  // SHOW upload UI only when admin has uploaded proof AND user has NOT uploaded yet.
  // Do NOT show upload UI for REVIEW state.
  const showUploadSection =
    status === "ADMIN_PROOF_UPLOADED" &&
    !hasServerUpload &&
    !withdrawal.screenshotUrl;

  const getPendingUploadsColor = () => {
    if (safeCount >= 3) return "text-destructive";
    if (safeCount >= 2) return "text-warning";
    return "text-success";
  };

  // Debug current state
  console.log("🔍 Current State:", {
    isUploading,
    uploadProgress,
    uploadedImage: !!uploadedImage,
    selectedFile: !!selectedFile,
    hasServerUpload,
    showUploadSection,
  });

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span>Withdrawal Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Details */}
        <div className="p-4 bg-muted/20 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Withdrawal Amount
            </span>
            <span className="font-bold text-lg">
              ${withdrawal.amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Verification Progress</span>
            <Badge className={cn("border", getStatusBadge())}>
              {statusLabel()}
            </Badge>
          </div>
          <div className="space-y-2">
            {/* animate progress changes with transition */}
            <Progress
              value={progressValue()}
              className="h-2 transition-all duration-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Request</span>
              <span>Admin Approval</span>
              <span>Client Proof</span>
              <span>Admin Review</span>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {/* Admin proof preview */}
        {status === "ADMIN_PROOF_UPLOADED" && withdrawal.adminProofUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-medium text-success">
                  Payment Proof Available
                </span>
              </div>
            </div>

            {!adminImgError ? (
              <>
                {/* Thumbnail with skeleton + click to open modal */}
                <button
                  type="button"
                  onClick={() => setIsAdminProofOpen(true)}
                  className="relative border rounded-md p-2 bg-muted/10 overflow-hidden w-full text-left group"
                >
                  {/* loading skeleton / spinner while admin image loads */}
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none",
                      {
                        "opacity-0": !adminImgLoading,
                        "opacity-100": adminImgLoading,
                      }
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Spinner className="w-8 h-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Loading proof
                      </span>
                    </div>
                  </div>

                  <img
                    src={withdrawal.adminProofUrl}
                    alt="Admin payment proof"
                    className="w-full max-h-60 object-contain rounded transition-transform duration-500 group-hover:scale-105"
                    onError={() => setAdminImgError(true)}
                    onLoad={() => setAdminImgLoading(false)}
                    crossOrigin="anonymous"
                  />

                  <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>Click to view</span>
                  </div>
                </button>

                {/* Fullscreen-ish modal */}
                <Dialog
                  open={isAdminProofOpen}
                  onOpenChange={(open) => setIsAdminProofOpen(open)}
                >
                  <DialogContent className="max-w-5xl w-full max-h-[90vh] p-4">
                    <DialogHeader>
                      <DialogTitle>Admin Payment Proof</DialogTitle>
                    </DialogHeader>
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={withdrawal.adminProofUrl}
                        alt="Admin payment proof full view"
                        className="max-h-[80vh] w-auto object-contain rounded-md"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <a
                href={withdrawal.adminProofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm underline"
              >
                <ExternalLink className="w-4 h-4" /> Open admin proof
              </a>
            )}

            {!hasServerUpload && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary font-medium">Next Step:</p>
                <p className="text-sm text-muted-foreground">
                  Please check your wallet and upload a screenshot of the
                  received payment for verification.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pending uploads strip — ONLY when ADMIN_PROOF_UPLOADED and no client proof yet */}
        {showPendingStrip && !hasServerUpload && (
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={cn("w-4 h-4", getPendingUploadsColor())}
              />
              <span className="text-sm font-medium">
                Pending Screenshot Uploads
              </span>
            </div>
            <span className={cn("font-bold", getPendingUploadsColor())}>
              {stripText}
            </span>
          </div>
        )}

        {/* Show confirmation message when user has uploaded proof but status is still ADMIN_PROOF_UPLOADED */}
        {status === "ADMIN_PROOF_UPLOADED" && hasServerUpload && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-medium text-success">
                Proof Uploaded Successfully
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your payment confirmation has been submitted and is awaiting admin
              review.
            </p>
          </div>
        )}

        {/* Awaiting admin approval (no strip here) */}
        {status === "PENDING" && (
          <div className="p-4 bg-muted/10 border border-muted/20 rounded-lg text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium text-muted-foreground mb-2">
              Awaiting Admin Approval
            </h4>
            <p className="text-sm text-muted-foreground">
              Your withdrawal request is being reviewed by our admin team.
              You'll receive notification once approved.
            </p>
          </div>
        )}

        {/* Upload section - ONLY for ADMIN_PROOF_UPLOADED and when no proof uploaded yet */}
        {showUploadSection && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-medium text-primary mb-2">
                Required: Payment Confirmation
              </h4>
              <p className="text-sm text-muted-foreground">
                Please upload a screenshot showing that you received the
                withdrawal amount in your wallet. This helps us verify the
                transaction was completed successfully.
              </p>
            </div>

            {/* Only show the file upload interface when there's no server proof */}
            {uploadedImage ? (
              <div className="space-y-4">
                <div className="relative border-2 border-dashed border-border rounded-lg p-4">
                  {/* overlay spinner while uploading */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10 border-2 border-primary/20">
                      <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-lg shadow-lg">
                        <Spinner className="w-10 h-10 text-primary" />
                        <div className="text-lg font-semibold text-primary">
                          Uploading... {Math.round(uploadProgress)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Please wait while we upload your proof
                        </div>
                      </div>
                    </div>
                  )}

                  <img
                    src={uploadedImage}
                    alt="Uploaded proof"
                    className="max-h-48 mx-auto rounded-lg transition-shadow duration-300 shadow-sm"
                  />
                </div>

                {/* animated progress bar for upload (visible while uploading) */}
                {isUploading && (
                  <div className="space-y-2">
                    <Progress
                      value={Math.round(uploadProgress)}
                      className="h-3 transition-all duration-300 bg-muted"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      Uploading snapshot — please do not close the window
                    </div>
                  </div>
                )}

                {onVerificationComplete && (
                  <Button
                    onClick={handleVerificationComplete}
                    className="w-full gradient-primary text-white"
                    disabled={isUploading}
                  >
                    Confirm & Submit for Review
                  </Button>
                )}

                {!hasServerUpload && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !selectedFile}
                    className="w-full gradient-primary text-white"
                  >
                    {isUploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="w-4 h-4 text-white" />
                        <span>Uploading... {Math.round(uploadProgress)}%</span>
                      </div>
                    ) : (
                      "Upload Proof"
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-shadow hover:shadow-lg relative">
                  {/* Show loading overlay on the upload area when uploading */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10 border-2 border-primary/20">
                      <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-lg shadow-lg">
                        <Spinner className="w-10 h-10 text-primary" />
                        <div className="text-lg font-semibold text-primary">
                          Uploading... {Math.round(uploadProgress)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Please wait while we upload your proof
                        </div>
                      </div>
                    </div>
                  )}

                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <Label
                    htmlFor={`screenshot-upload-${withdrawal.id}`}
                    className="cursor-pointer"
                  >
                    <span className="text-primary font-medium">
                      Click to upload screenshot
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      or drag and drop
                    </span>
                  </Label>
                  <Input
                    id={`screenshot-upload-${withdrawal.id}`}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={hasServerUpload || isUploading}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG up to 5MB
                  </p>
                </div>

                {selectedFile && !hasServerUpload && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !selectedFile}
                    className="w-full gradient-primary text-white"
                  >
                    {isUploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="w-4 h-4 text-white" />
                        <span>Uploading... {Math.round(uploadProgress)}%</span>
                      </div>
                    ) : (
                      "Upload Proof"
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Review state */}
        {status === "REVIEW" && (
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">Under Admin Review</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll notify you once the verification is complete.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Approved or Rejected summaries */}
        {status === "APPROVED" && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-sm">Withdrawal completed successfully.</span>
          </div>
        )}
        {status === "REJECTED" && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm">
              Withdrawal was rejected. Please contact support.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalVerification;
