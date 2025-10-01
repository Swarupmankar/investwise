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
  FileImage,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProofImageModal from "./ProofImageModal";

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
  onUploadScreenshot: (file: File) => Promise<{ success: boolean }>; // Updated signature
  onVerificationComplete: (
    action: "client_uploaded" | "admin_approved" | "approve_final" | "reject"
  ) => Promise<{ success: boolean }>; // Updated signature
  pendingUploadsCount: number;
  simulateAdminApproval?: (
    withdrawalId: string,
    file?: File
  ) => Promise<{ success: boolean }>; // Updated signature
  simulateClientScreenshotUpload?: (
    withdrawalId: string,
    file: File
  ) => Promise<{ success: boolean }>; // Updated signature
}

const WithdrawalVerification = ({
  withdrawal,
  onUploadScreenshot,
  onVerificationComplete,
  pendingUploadsCount,
  simulateAdminApproval,
  simulateClientScreenshotUpload,
}: WithdrawalVerificationProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string>(
    withdrawal.screenshotUrl || ""
  );
  const [isUploading, setIsUploading] = useState(false);

  const maxPendingUploads = 3;
  const isBlocked = pendingUploadsCount >= maxPendingUploads;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await onUploadScreenshot(selectedFile);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerificationComplete = async () => {
    try {
      await onVerificationComplete("client_uploaded");
    } catch (error) {
      console.error("Verification completion failed:", error);
    }
  };

  const getStatusIcon = () => {
    if (isBlocked) return <XCircle className="w-5 h-5 text-destructive" />;
    if (withdrawal.status === "completed")
      return <CheckCircle className="w-5 h-5 text-success" />;
    if (withdrawal.status === "admin_review")
      return <Clock className="w-5 h-5 text-warning" />;
    if (withdrawal.status === "client_verification_pending")
      return <Upload className="w-5 h-5 text-primary" />;
    if (withdrawal.status === "admin_approved")
      return <Shield className="w-5 h-5 text-blue-600" />;
    if (withdrawal.status === "pending")
      return <Clock className="w-5 h-5 text-muted-foreground" />;
    return <Upload className="w-5 h-5 text-primary" />;
  };

  const getStatusColor = () => {
    if (isBlocked) return "text-destructive";
    if (withdrawal.status === "completed") return "text-success";
    if (withdrawal.status === "admin_review") return "text-warning";
    if (withdrawal.status === "client_verification_pending")
      return "text-primary";
    if (withdrawal.status === "admin_approved") return "text-blue-600";
    if (withdrawal.status === "pending") return "text-muted-foreground";
    return "text-primary";
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
          <span className={getStatusColor()}>Withdrawal Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Withdrawal Details */}
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

        {/* Verification Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Verification Progress</span>
            <Badge
              className={cn(
                "border",
                withdrawal.status === "completed"
                  ? "bg-success/10 text-success border-success/20"
                  : withdrawal.status === "admin_review"
                  ? "bg-warning/10 text-warning border-warning/20"
                  : withdrawal.status === "client_verification_pending"
                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                  : withdrawal.status === "admin_approved"
                  ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                  : withdrawal.status === "pending"
                  ? "bg-muted/10 text-muted-foreground border-muted/20"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {withdrawal.status === "completed"
                ? "Completed"
                : withdrawal.status === "admin_review"
                ? "Under Admin Review"
                : withdrawal.status === "client_verification_pending"
                ? "Upload Your Proof"
                : withdrawal.status === "admin_approved"
                ? "Admin Approved - Payment Processing"
                : withdrawal.status === "pending"
                ? "Awaiting Admin Approval"
                : "Pending"}
            </Badge>
          </div>

          <div className="space-y-2">
            <Progress
              value={
                withdrawal.status === "completed"
                  ? 100
                  : withdrawal.status === "admin_review"
                  ? 80
                  : withdrawal.status === "client_verification_pending" &&
                    uploadedImage
                  ? 60
                  : withdrawal.status === "client_verification_pending"
                  ? 40
                  : withdrawal.status === "admin_approved"
                  ? 20
                  : withdrawal.status === "pending"
                  ? 0
                  : 0
              }
              className="h-2"
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

        {/* Pending Uploads Counter */}
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

        {/* Pending Admin Approval */}
        {withdrawal.status === "pending" && (
          <div className="p-4 bg-muted/10 border border-muted/20 rounded-lg text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium text-muted-foreground mb-2">
              Awaiting Admin Approval
            </h4>
            <p className="text-sm text-muted-foreground">
              Your withdrawal request is being reviewed by our admin team.
              You'll receive notification once approved.
            </p>
            {simulateAdminApproval && (
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => simulateAdminApproval(withdrawal.id)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  [Demo] Simulate Admin Approval
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Admin Approved - Payment Processing */}
        {withdrawal.status === "admin_approved" && (
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="text-center mb-4">
              <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h4 className="font-medium text-purple-600 mb-2">
                Admin Approved - Processing Payment
              </h4>
              <p className="text-sm text-muted-foreground">
                Your withdrawal has been approved and payment is being processed
                to your wallet.
              </p>
            </div>

            {withdrawal.adminProofUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="font-medium text-success">
                      Payment Proof Available
                    </span>
                  </div>
                  <ProofImageModal
                    imageUrl={withdrawal.adminProofUrl}
                    title="Admin Payment Proof"
                    description="Proof that the admin has processed your withdrawal payment"
                    type="admin"
                  />
                </div>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary font-medium">Next Step:</p>
                  <p className="text-sm text-muted-foreground">
                    Please check your wallet and upload a screenshot of the
                    received payment for verification.
                  </p>
                </div>
                {simulateClientScreenshotUpload &&
                  !withdrawal.screenshotUrl && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const dummyFile = new File([""], "simulation.png", {
                            type: "image/png",
                          });
                          await simulateClientScreenshotUpload(
                            withdrawal.id,
                            dummyFile
                          );
                        }}
                        className="text-xs bg-green-50 hover:bg-green-100 border-green-200"
                      >
                        [Demo] Simulate Client Proof Upload
                      </Button>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Upload Section */}
        {(withdrawal.status === "admin_approved" ||
          withdrawal.status === "client_verification_pending") && (
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

                <Button
                  onClick={handleVerificationComplete}
                  className="w-full gradient-primary text-white"
                >
                  Confirm & Submit for Review
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <Label htmlFor="screenshot-upload" className="cursor-pointer">
                    <span className="text-primary font-medium">
                      Click to upload screenshot
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      or drag and drop
                    </span>
                  </Label>
                  <Input
                    id="screenshot-upload"
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

        {/* Warning for pending uploads */}
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
