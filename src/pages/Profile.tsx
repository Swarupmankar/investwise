// src/pages/Profile.tsx
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Shield,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import {
  useGetUserProfileQuery,
  useChangePasswordMutation,
  useGetKycStatusQuery,
  useUploadKycDocsMutation,
} from "@/API/userApi";

export default function Profile() {
  // profile + kyc hooks
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetUserProfileQuery();
  const {
    data: kycStatusData,
    isLoading: kycLoading,
    refetch: refetchKycStatus,
  } = useGetKycStatusQuery();

  // upload mutation (expects: { file: File, docType: KycDocType, address?: string })
  const [uploadKyc, { isLoading: isUploading }] = useUploadKycDocsMutation();

  // change password (keeps UI)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [
    changePassword,
    { isLoading: isChanging, isSuccess: changeSuccess, error: changeError },
  ] = useChangePasswordMutation();

  // UI state
  const [showPassword, setShowPassword] = useState(false);

  // file states
  const [passportFrontFile, setPassportFrontFile] = useState<File | null>(null);
  const [passportBackFile, setPassportBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [utilityBillFile, setUtilityBillFile] = useState<File | null>(null);

  // address fields (kept separate for user input, will be merged when sending)
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  // toast
  const [toast, setToast] = useState<null | {
    type: "success" | "error" | "info";
    message: string;
  }>(null);
  const showToast = (
    type: "success" | "error" | "info",
    message: string,
    duration = 3000
  ) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), duration);
  };

  useEffect(() => {
    document.title = "Profile — KYC Verification";
  }, []);

  // helpers
  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      sizes.length - 1
    );
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  type KycStatus = "Not Submitted" | "Pending" | "Approved" | "Rejected";
  const mapApiStatus = (s?: string): KycStatus => {
    if (!s) return "Not Submitted";
    switch (s.toUpperCase()) {
      case "PENDING":
        return "Pending";
      case "APPROVED":
        return "Approved";
      case "REJECTED":
        return "Rejected";
      case "NOT_SUBMITTED":
        return "Not Submitted";
      default:
        return s as KycStatus;
    }
  };

  const passportFrontStatus = mapApiStatus(
    kycStatusData?.data?.documents?.passportFront?.status
  );
  const passportBackStatus = mapApiStatus(
    kycStatusData?.data?.documents?.passportBack?.status
  );
  const selfieStatus = mapApiStatus(
    kycStatusData?.data?.documents?.selfieWithId?.status
  );
  const utilityBillStatus = mapApiStatus(
    kycStatusData?.data?.documents?.utilityBill?.status
  );
  const addressSubmitted = !!kycStatusData?.data?.documents?.address?.submitted;

  const passportFrontReason =
    kycStatusData?.data?.documents?.passportFront?.rejectionReason ?? "";
  const passportBackReason =
    kycStatusData?.data?.documents?.passportBack?.rejectionReason ?? "";
  const selfieReason =
    kycStatusData?.data?.documents?.selfieWithId?.rejectionReason ?? "";
  const utilityBillReason =
    kycStatusData?.data?.documents?.utilityBill?.rejectionReason ?? "";

  const getKycStatusBadge = (status: string) => {
    const key = (status || "").toLowerCase();
    switch (key) {
      case "pending":
        return "bg-yellow-400 text-white";
      case "approved":
        return "bg-green-600 text-white";
      case "rejected":
        return "bg-red-600 text-white";
      case "not submitted":
      case "not_submitted":
      case "notsubmitted":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getKycIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle2 className="h-5 w-5" />;
      case "Pending":
        return <Clock className="h-5 w-5" />;
      case "Rejected":
        return <XCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  function SubmittedCard({
    title,
    subtitle,
    reason,
    status,
  }: {
    title: string;
    subtitle?: string;
    reason?: string;
    status?: string;
  }) {
    return (
      <div className="border-2 rounded-lg p-6 text-center border-orange-400 bg-orange-50">
        <div className="flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-orange-600" />
        </div>
        <p className="mt-3 font-medium text-orange-700">{title}</p>
        {subtitle && <p className="text-xs text-orange-600 mt-1">{subtitle}</p>}
        <div className="mt-3">
          <span className="inline-block rounded-full px-3 py-1 text-xs bg-white/80 text-orange-800 shadow-sm">
            {status ? status.toLowerCase() : "submitted"}
          </span>
        </div>
        {reason && (
          <p className="mt-2 text-xs text-destructive">Reason: {reason}</p>
        )}
      </div>
    );
  }

  // ------------------- Password match logic (real-time) -------------------
  // compute whether user typed confirm and whether they match
  const confirmTyped = confirmPassword.length > 0;
  const passwordsMatch = useMemo(
    () => newPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );
  // ------------------------------------------------------------------------

  if (profileLoading || kycLoading) return <div>Loading...</div>;
  if (!profile || profileError)
    return (
      <div>
        <p className="text-destructive">Failed to load profile.</p>
        <Button
          onClick={() => {
            refetchProfile();
            refetchKycStatus();
          }}
        >
          Retry
        </Button>
      </div>
    );

  // Build combined address string for utility bill upload
  const combinedAddress =
    [address1, address2].filter(Boolean).join(" ") +
    (city ? `, ${city}` : "") +
    (stateProv ? `, ${stateProv}` : "") +
    (postalCode ? `, ${postalCode}` : "") +
    (country ? `, ${country}` : "");
  const cleanedCombinedAddress = combinedAddress.replace(/^,?\s*/, "");

  // uploadDoc uses the object shape your RTK expects: { file, docType, address? }
  const uploadDoc = async (
    file: File | null,
    docType:
      | "PASSPORT_FRONT"
      | "PASSPORT_BACK"
      | "SELFIE_WITH_ID"
      | "UTILITY_BILL"
  ) => {
    if (!file) {
      showToast("info", "Please choose a file before submitting.");
      return;
    }

    // If utility bill, ensure address is present
    if (docType === "UTILITY_BILL" && !cleanedCombinedAddress) {
      showToast("info", "Please fill your address fields before uploading.");
      return;
    }

    try {
      const payload: any = { file, docType };
      if (docType === "UTILITY_BILL") payload.address = cleanedCombinedAddress;

      await uploadKyc(payload).unwrap();

      showToast(
        "success",
        "Uploaded successfully. Status will update shortly."
      );

      // refetch kyc status to reflect new uploaded state
      refetchKycStatus();

      // clear local preview
      if (docType === "PASSPORT_FRONT") setPassportFrontFile(null);
      if (docType === "PASSPORT_BACK") setPassportBackFile(null);
      if (docType === "SELFIE_WITH_ID") setSelfieFile(null);
      if (docType === "UTILITY_BILL") setUtilityBillFile(null);
    } catch (e: any) {
      showToast("error", e?.data?.message ?? "Upload failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Account Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your personal information and security preferences
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {`${(profile.firstName || "").charAt(0)}${(
              profile.lastName || ""
            ).charAt(0)}`.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
        </TabsList>

        {/* --- PROFILE TAB (kept unchanged layout) --- */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-card-foreground">Full Name</Label>
                    <Input
                      defaultValue={`${profile.firstName} ${profile.lastName}`}
                      className="bg-input border-border"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-card-foreground">
                      Email Address
                    </Label>
                    <Input
                      defaultValue={profile.email}
                      type="email"
                      className="bg-input border-border"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-card-foreground">Phone Number</Label>
                    <Input
                      defaultValue={profile.phoneNumber}
                      type="tel"
                      className="bg-input border-border"
                      readOnly
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">
                  Account Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-card-foreground/60">
                      Member Since
                    </span>
                    <span className="text-card-foreground">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-card-foreground/60">
                      Account Status
                    </span>
                    <Badge className="bg-success text-white">
                      {profile.accountStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-card-foreground/60">KYC Status</span>
                    <Badge
                      className={getKycStatusBadge(
                        kycStatusData?.data?.status ?? "Not Submitted"
                      )}
                    >
                      {(kycStatusData?.data?.status ?? "NOT_SUBMITTED")
                        .replace("_", " ")
                        .toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- SECURITY TAB (updated: real-time confirm password check) --- */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Shield className="h-5 w-5" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-card-foreground">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="bg-input border-border pr-10"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-card-foreground">New Password</Label>
                  <Input
                    type="password"
                    className="bg-input border-border"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-card-foreground">
                    Confirm New Password
                  </Label>
                  <Input
                    type="password"
                    className={`bg-input border-border ${
                      confirmTyped && !passwordsMatch
                        ? "border-destructive"
                        : ""
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {/* Real-time helper message */}
                  {confirmTyped && (
                    <p
                      className={`mt-1 text-sm ${
                        passwordsMatch ? "text-success" : "text-destructive"
                      }`}
                    >
                      {passwordsMatch
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </p>
                  )}
                </div>

                {changeSuccess && (
                  <Alert className="border-success/50 text-success [&>svg]:text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Password Updated</AlertTitle>
                    <AlertDescription className="text-sm">
                      Your password was updated successfully.
                    </AlertDescription>
                  </Alert>
                )}
                {changeError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription className="text-sm">
                      {(changeError as any)?.data?.message ??
                        "Failed to update password. Please try again."}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={async () => {
                    if (!currentPassword || !newPassword) {
                      showToast(
                        "info",
                        "Please fill current and new password fields."
                      );
                      return;
                    }
                    if (!passwordsMatch) {
                      showToast(
                        "error",
                        "New password and confirm password do not match."
                      );
                      return;
                    }
                    try {
                      await changePassword({
                        currentPassword,
                        newPassword,
                      }).unwrap();
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      showToast("success", "Password updated successfully.");
                    } catch (e: any) {
                      showToast(
                        "error",
                        e?.data?.message ?? "Failed to update password."
                      );
                    }
                  }}
                  disabled={
                    isChanging ||
                    !passwordsMatch ||
                    !currentPassword ||
                    !newPassword
                  }
                >
                  {isChanging ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- KYC TAB (unchanged except previous improvements) --- */}
        <TabsContent value="kyc" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                {getKycIcon(kycStatusData?.data?.status ?? "")}
                KYC Verification
                <Badge
                  className={getKycStatusBadge(
                    kycStatusData?.data?.status ?? "Not Submitted"
                  )}
                >
                  {(kycStatusData?.data?.status ?? "NOT_SUBMITTED")
                    .replace("_", " ")
                    .toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-primary/5 p-4 rounded-lg">
                <p className="text-sm text-card-foreground">
                  <strong>Why verify your identity?</strong>
                  <br />
                  KYC verification increases your withdrawal limits and ensures
                  account security.
                </p>
              </div>

              {/* Passport front/back side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* passport front */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-card-foreground">
                      Passport / ID (Front)
                    </h4>
                    <Badge className={getKycStatusBadge(passportFrontStatus)}>
                      {passportFrontStatus}
                    </Badge>
                  </div>

                  {passportFrontStatus !== "Not Submitted" ? (
                    <SubmittedCard
                      title="Passport / ID (Front)"
                      subtitle="JPG, PNG or PDF (Max 5MB)"
                      reason={passportFrontReason}
                      status={passportFrontStatus}
                    />
                  ) : (
                    <>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <input
                          id="passport-front-upload"
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) =>
                            setPassportFrontFile(
                              e.currentTarget.files?.[0] ?? null
                            )
                          }
                        />
                        <label
                          htmlFor="passport-front-upload"
                          className="cursor-pointer block"
                        >
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Upload Passport / ID (Front)
                          </p>
                        </label>
                      </div>

                      {passportFrontFile && (
                        <div className="rounded-md border border-border p-3 text-left">
                          <div className="flex items-center justify-between text-sm text-card-foreground/80">
                            <span className="truncate">
                              {passportFrontFile.name}
                            </span>
                            <span className="ml-2 shrink-0 text-muted-foreground">
                              {formatBytes(passportFrontFile.size)}
                            </span>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPassportFrontFile(null);
                                const el = document.getElementById(
                                  "passport-front-upload"
                                ) as HTMLInputElement | null;
                                if (el) el.value = "";
                              }}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        disabled={!passportFrontFile || isUploading}
                        onClick={() =>
                          uploadDoc(passportFrontFile, "PASSPORT_FRONT")
                        }
                      >
                        Submit ID (Front) for Review
                      </Button>
                    </>
                  )}
                </div>

                {/* passport back */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-card-foreground">
                      Passport / ID (Back)
                    </h4>
                    <Badge className={getKycStatusBadge(passportBackStatus)}>
                      {passportBackStatus}
                    </Badge>
                  </div>

                  {passportBackStatus !== "Not Submitted" ? (
                    <SubmittedCard
                      title="Passport / ID (Back)"
                      subtitle="JPG, PNG or PDF (Max 5MB)"
                      reason={passportBackReason}
                      status={passportBackStatus}
                    />
                  ) : (
                    <>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <input
                          id="passport-back-upload"
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) =>
                            setPassportBackFile(
                              e.currentTarget.files?.[0] ?? null
                            )
                          }
                        />
                        <label
                          htmlFor="passport-back-upload"
                          className="cursor-pointer block"
                        >
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Upload Passport / ID (Back)
                          </p>
                        </label>
                      </div>

                      {passportBackFile && (
                        <div className="rounded-md border border-border p-3 text-left">
                          <div className="flex items-center justify-between text-sm text-card-foreground/80">
                            <span className="truncate">
                              {passportBackFile.name}
                            </span>
                            <span className="ml-2 shrink-0 text-muted-foreground">
                              {formatBytes(passportBackFile.size)}
                            </span>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPassportBackFile(null);
                                const el = document.getElementById(
                                  "passport-back-upload"
                                ) as HTMLInputElement | null;
                                if (el) el.value = "";
                              }}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        disabled={!passportBackFile || isUploading}
                        onClick={() =>
                          uploadDoc(passportBackFile, "PASSPORT_BACK")
                        }
                      >
                        Submit ID (Back) for Review
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Selfie full width row */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-card-foreground">
                    Selfie Verification
                  </h4>
                  <Badge className={getKycStatusBadge(selfieStatus)}>
                    {selfieStatus}
                  </Badge>
                </div>

                {selfieStatus !== "Not Submitted" ? (
                  <SubmittedCard
                    title="Selfie (hold your ID)"
                    subtitle="JPG, PNG (Max 5MB)"
                    reason={selfieReason}
                    status={selfieStatus}
                  />
                ) : (
                  <>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        id="selfie-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setSelfieFile(e.currentTarget.files?.[0] ?? null)
                        }
                      />
                      <label
                        htmlFor="selfie-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Upload a clear selfie holding your ID
                        </p>
                      </label>
                    </div>

                    {selfieFile && (
                      <div className="rounded-md border border-border p-3 text-left">
                        <div className="flex items-center justify-between text-sm text-card-foreground/80">
                          <span className="truncate">{selfieFile.name}</span>
                          <span className="ml-2 shrink-0 text-muted-foreground">
                            {formatBytes(selfieFile.size)}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelfieFile(null);
                              const el = document.getElementById(
                                "selfie-upload"
                              ) as HTMLInputElement | null;
                              if (el) el.value = "";
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      disabled={!selfieFile || isUploading}
                      onClick={() => uploadDoc(selfieFile, "SELFIE_WITH_ID")}
                    >
                      Submit Selfie for Review
                    </Button>
                  </>
                )}
              </div>

              {/* Address inputs + utility bill below */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-card-foreground">
                    Address Information
                  </h4>
                  <Badge
                    className={getKycStatusBadge(
                      addressSubmitted
                        ? utilityBillStatus ?? "Pending"
                        : "Not Submitted"
                    )}
                  >
                    {addressSubmitted
                      ? utilityBillStatus ?? "Pending"
                      : "Not Submitted"}
                  </Badge>
                </div>

                {utilityBillStatus !== "Not Submitted" && addressSubmitted ? (
                  <SubmittedCard
                    title="Utility Bill / Address Proof"
                    subtitle="PDF or Image showing full name & address"
                    reason={utilityBillReason}
                    status={utilityBillStatus}
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-card-foreground" htmlFor="addr1">
                          Address Line 1
                        </Label>
                        <Input
                          id="addr1"
                          value={address1}
                          onChange={(e) => setAddress1(e.target.value)}
                          placeholder="Street address"
                          className="bg-input border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-card-foreground" htmlFor="addr2">
                          Address Line 2
                        </Label>
                        <Input
                          id="addr2"
                          value={address2}
                          onChange={(e) => setAddress2(e.target.value)}
                          placeholder="Apt, suite, etc. (optional)"
                          className="bg-input border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-card-foreground" htmlFor="city">
                          City
                        </Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="bg-input border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-card-foreground" htmlFor="state">
                          State/Province
                        </Label>
                        <Input
                          id="state"
                          value={stateProv}
                          onChange={(e) => setStateProv(e.target.value)}
                          className="bg-input border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          className="text-card-foreground"
                          htmlFor="postal"
                        >
                          Postal Code
                        </Label>
                        <Input
                          id="postal"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="bg-input border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          className="text-card-foreground"
                          htmlFor="country"
                        >
                          Country
                        </Label>
                        <Input
                          id="country"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="bg-input border-border"
                        />
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        id="utility-upload"
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) =>
                          setUtilityBillFile(e.currentTarget.files?.[0] ?? null)
                        }
                      />
                      <label
                        htmlFor="utility-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Upload Address Proof (Utility bill, Bank statement,
                          etc.)
                        </p>
                      </label>
                    </div>

                    {utilityBillFile && (
                      <div className="rounded-md border border-border p-3 text-left">
                        <div className="flex items-center justify-between text-sm text-card-foreground/80">
                          <span className="truncate">
                            {utilityBillFile.name}
                          </span>
                          <span className="ml-2 shrink-0 text-muted-foreground">
                            {formatBytes(utilityBillFile.size)}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUtilityBillFile(null);
                              const el = document.getElementById(
                                "utility-upload"
                              ) as HTMLInputElement | null;
                              if (el) el.value = "";
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      disabled={
                        !address1 ||
                        !city ||
                        !stateProv ||
                        !postalCode ||
                        !country ||
                        !utilityBillFile ||
                        isUploading
                      }
                      onClick={() => uploadDoc(utilityBillFile, "UTILITY_BILL")}
                    >
                      Submit Address for Review
                    </Button>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-card-foreground">
                  Verification Guidelines
                </h4>
                <ul className="text-sm text-card-foreground/80 space-y-1">
                  <li>• Document must be valid and not expired</li>
                  <li>• All corners of the document must be visible</li>
                  <li>• Photo must be clear and readable</li>
                  <li>• Selfie must clearly show your face and ID document</li>
                  <li>
                    • Address proof must clearly show your full name, address,
                    and a date within the last 3 months
                  </li>
                  <li>• Processing time: 1-3 business days</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone unchanged */}
      {/* <Card className="bg-card border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card> */}

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
