import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, XCircle, Clock, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface WithdrawalVerificationProps {
  withdrawal: {
    id: string;
    amount: number;
    status: string;
    verificationAttempts?: number;
    screenshotUrl?: string;
    verificationDeadline?: string;
    isBlocked?: boolean;
  };
  onUploadScreenshot: (withdrawalId: string, file: File) => void;
  onVerificationComplete: (withdrawalId: string) => void;
  pendingUploadsCount: number;
}

const WithdrawalVerification = ({ 
  withdrawal, 
  onUploadScreenshot, 
  onVerificationComplete,
  pendingUploadsCount
}: WithdrawalVerificationProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string>(withdrawal.screenshotUrl || "");
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
    
    // Simulate file upload
    setTimeout(() => {
      onUploadScreenshot(withdrawal.id, selectedFile);
      setIsUploading(false);
    }, 2000);
  };

  const getStatusIcon = () => {
    if (isBlocked) return <XCircle className="w-5 h-5 text-destructive" />;
    if (withdrawal.status === "approved") return <CheckCircle className="w-5 h-5 text-success" />;
    if (withdrawal.status === "verification_pending") return <Clock className="w-5 h-5 text-warning" />;
    if (withdrawal.status === "admin_approved") return <Upload className="w-5 h-5 text-primary" />;
    if (withdrawal.status === "pending_admin_approval") return <Clock className="w-5 h-5 text-muted-foreground" />;
    return <Upload className="w-5 h-5 text-primary" />;
  };

  const getStatusColor = () => {
    if (isBlocked) return "text-destructive";
    if (withdrawal.status === "approved") return "text-success";
    if (withdrawal.status === "verification_pending") return "text-warning";
    if (withdrawal.status === "admin_approved") return "text-primary";
    if (withdrawal.status === "pending_admin_approval") return "text-muted-foreground";
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
              <h3 className="text-lg font-semibold text-destructive">Withdrawal Blocked</h3>
              <p className="text-muted-foreground mt-2">
                Your withdrawal functionality has been temporarily blocked due to multiple failed verification attempts.
              </p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">
                You have {pendingUploadsCount} withdrawals pending screenshot upload
              </p>
              <p className="text-xs text-muted-foreground">
                Please upload screenshots for your previous withdrawals before creating new ones.
              </p>
            </div>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
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
            <span className="text-sm text-muted-foreground">Withdrawal Amount</span>
            <span className="font-bold text-lg">${withdrawal.amount.toLocaleString()}</span>
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
            <Badge className={cn("border", 
              withdrawal.status === "approved" ? "bg-success/10 text-success border-success/20" :
              withdrawal.status === "verification_pending" ? "bg-warning/10 text-warning border-warning/20" :
              withdrawal.status === "admin_approved" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
              withdrawal.status === "pending_admin_approval" ? "bg-muted/10 text-muted-foreground border-muted/20" :
              "bg-muted text-muted-foreground border-border"
            )}>
              {withdrawal.status === "approved" ? "Completed" : 
               withdrawal.status === "verification_pending" ? "Under Review" : 
               withdrawal.status === "admin_approved" ? "Upload Screenshot" :
               withdrawal.status === "pending_admin_approval" ? "Awaiting Admin Approval" :
               "Pending"}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={
                withdrawal.status === "approved" ? 100 : 
                withdrawal.status === "verification_pending" ? 75 :
                withdrawal.status === "admin_approved" && uploadedImage ? 50 :
                withdrawal.status === "admin_approved" ? 25 :
                withdrawal.status === "pending_admin_approval" ? 0 : 0
              } 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Admin Approval</span>
              <span>Upload Proof</span>
              <span>Under Review</span>
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* Pending Uploads Counter */}
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("w-4 h-4", getPendingUploadsColor())} />
            <span className="text-sm font-medium">Pending Screenshot Uploads</span>
          </div>
          <span className={cn("font-bold", getPendingUploadsColor())}>
            {pendingUploadsCount}/{maxPendingUploads} ({maxPendingUploads - pendingUploadsCount} remaining)
          </span>
        </div>

        {/* Admin Approval Waiting */}
        {withdrawal.status === "pending_admin_approval" && (
          <div className="p-4 bg-muted/10 border border-muted/20 rounded-lg text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium text-muted-foreground mb-2">Awaiting Admin Approval</h4>
            <p className="text-sm text-muted-foreground">
              Your withdrawal request is being reviewed by our admin team. You'll be able to upload proof once approved.
            </p>
          </div>
        )}

        {/* Upload Section */}
        {withdrawal.status === "admin_approved" && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-medium text-primary mb-2">Required: Payment Confirmation</h4>
              <p className="text-sm text-muted-foreground">
                Please upload a screenshot showing that you received the withdrawal amount in your wallet. 
                This helps us verify the transaction was completed successfully.
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
                  onClick={() => onVerificationComplete(withdrawal.id)}
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
                    <span className="text-primary font-medium">Click to upload screenshot</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
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
                <p className="font-medium text-warning">Warning: Multiple Pending Uploads</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {pendingUploadsCount} withdrawals pending screenshot upload. Upload screenshots soon to avoid being blocked from new withdrawals.
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