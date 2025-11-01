import { useState } from "react";
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
  // made optional + guarded (prevents "not a function")
  onVerificationComplete?: (
    action: "client_uploaded" | "admin_approved" | "approve_final" | "reject"
  ) => Promise<{ success: boolean }>;
  pendingUploadsCount: number;
}

const API_ORIGIN =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000";

const normalizeImageUrl = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url; // already absolute
  // prefix relative paths from API origin (handles "/upload/..." and "upload/...")
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

const WithdrawalVerification = ({
  withdrawal,
  onUploadScreenshot,
  onVerificationComplete,
  pendingUploadsCount,
}: WithdrawalVerificationProps) => {
  const status = (withdrawal.status || "").toUpperCase();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string>(
    withdrawal.screenshotUrl || ""
  );
  const [isUploading, setIsUploading] = useState(false);
  const [adminImgError, setAdminImgError] = useState(false); // fallback for admin proof

  const maxPendingUploads = 3;
  const isBlocked = pendingUploadsCount >= maxPendingUploads;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await onUploadScreenshot(selectedFile);
      // keep preview visible; you can clear selectedFile if you want
      // setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerificationComplete = async () => {
    // guard to prevent runtime error if parent didn't pass this
    if (onVerificationComplete) {
      await onVerificationComplete("client_uploaded");
    }
  };

  const getStatusIcon = () => {
    if (isBlocked) return <XCircle className="w-5 h-5 text-destructive" />;
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

  const getPendingUploadsColor = () => {
    if (pendingUploadsCount >= 3) return "text-destructive";
    if (pendingUploadsCount >= 2) return "text-warning";
    return "text-success";
  };

  if (isBlocked) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-destructive">
                Withdrawal Blocked
              </h3>
              <p className="text-muted-foreground mt-2">
                Your withdrawal functionality has been temporarily blocked due
                to multiple failed verification attempts.
              </p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">
                You have {pendingUploadsCount} withdrawals pending screenshot
                upload
              </p>
              <p className="text-xs text-muted-foreground">
                Please upload screenshots for your previous withdrawals before
                creating new ones.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span>{"Withdrawal Verification"}</span>
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
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Request ID</span>
            <span className="text-sm font-mono">{withdrawal.id}</span>
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
            <Progress value={progressValue()} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Request</span>
              <span>Admin Approval</span>
              <span>Client Proof</span>
              <span>Admin Review</span>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {/* Admin proof — inline in the card with a safe fallback (no modal/new tab) */}
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
              <div className="border rounded-md p-2 bg-muted/10">
                <img
                  src={normalizeImageUrl(withdrawal.adminProofUrl)}
                  alt="Admin proof"
                  className="w-full max-h-60 object-contain rounded"
                  onError={() => setAdminImgError(true)}
                  crossOrigin="anonymous"
                />
              </div>
            ) : (
              <a
                href={normalizeImageUrl(withdrawal.adminProofUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open admin proof
              </a>
            )}

            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary font-medium">Next Step:</p>
              <p className="text-sm text-muted-foreground">
                Please check your wallet and upload a screenshot of the received
                payment for verification.
              </p>
            </div>
          </div>
        )}

        {/* Pending uploads counter */}
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
            {pendingUploadsCount}/{maxPendingUploads} (
            {maxPendingUploads - pendingUploadsCount} remaining)
          </span>
        </div>

        {/* Awaiting admin approval */}
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

        {/* Upload section */}
        {(status === "ADMIN_PROOF_UPLOADED" || status === "REVIEW") && (
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

            {uploadedImage ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <img
                    src={uploadedImage}
                    alt="Uploaded proof"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                </div>
                {/* Only show this button if parent provided the handler */}
                {onVerificationComplete && (
                  <Button
                    onClick={handleVerificationComplete}
                    className="w-full gradient-primary text-white"
                  >
                    Confirm & Submit for Review
                  </Button>
                )}
                {/* Always allow uploading to server */}
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full gradient-primary text-white"
                >
                  {isUploading ? "Uploading..." : "Upload Proof"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
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
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG up to 5MB
                  </p>
                </div>

                {selectedFile && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full gradient-primary text-white"
                  >
                    {isUploading ? "Uploading..." : "Upload Proof"}
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

        {/* Warning for many pending uploads */}
        {pendingUploadsCount >= 2 && pendingUploadsCount < 3 && (
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">
                  Warning: Multiple Pending Uploads
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {pendingUploadsCount} withdrawals pending screenshot
                  upload. Upload screenshots soon to avoid being blocked from
                  new withdrawals.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalVerification;
