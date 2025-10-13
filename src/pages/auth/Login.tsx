import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { login } from "@/API/auth.api";
import {
  useSendForgetPasswordOtpMutation,
  useResetPasswordUsingOtpMutation,
} from "@/API/pass.api"; // adjust path if needed

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { toast } = useToast();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset">(
    "email"
  );

  // keep the email that was used to request OTP
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // RTK Query mutations
  const [sendOtp, { isLoading: sendingOtp }] =
    useSendForgetPasswordOtpMutation();
  const [resetPasswordUsingOtp, { isLoading: resettingPassword }] =
    useResetPasswordUsingOtpMutation();

  // Redux (typed hooks recommended)
  const dispatch: any = useDispatch();
  const auth = useSelector((state: any) => state.auth);
  const { isLoading, isError, error, isAuthenticated, user } = auth || {};

  const navigate = useNavigate();

  // react-hook-form for forgot password modal (email step)
  const forgotSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
  });
  type ForgotInputs = z.infer<typeof forgotSchema>;

  const {
    register,
    handleSubmit: handleForgotSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
  } = useForm<ForgotInputs>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  // Show login error toasts only when login actually errored
  useEffect(() => {
    if (isError && error) {
      toast({
        title: "Sign in failed",
        description:
          typeof error === "string"
            ? error
            : "Unable to sign in. Please try again.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  useEffect(() => {
    if (isAuthenticated) {
      toast({
        title: "Signed in",
        description: `Welcome back${user?.name ? `, ${user.name}` : ""}!`,
      });
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate, toast, user]);

  // --- Forgot password handlers ---

  // 1) Send OTP and persist the email used to request OTP
  const onForgotSubmit = async (data: ForgotInputs) => {
    const requestedEmail = data.email;
    try {
      await sendOtp({ email: requestedEmail }).unwrap();
      setForgotEmail(requestedEmail);
      toast({
        title: "Verification code sent",
        description: `A 6-digit code was sent to ${requestedEmail}.`,
      });
      setForgotStep("otp");
    } catch (err: any) {
      toast({
        title: "Failed to send code",
        description:
          err?.data?.message ||
          err?.message ||
          "Unable to send verification code. Please try again.",
        variant: "destructive",
      });
    }
  };

  // 2) client-side OTP check (server validates on reset)
  const onVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // defensive
    if (otp.trim().length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code.",
        variant: "destructive",
      });
      return;
    }
    setForgotStep("reset");
  };

  // resend code: prefer the actual email used to request OTP, otherwise fallbacks
  const handleResendCode = async () => {
    const targetEmail = forgotEmail || getValues("email") || email;
    if (!targetEmail) {
      toast({
        title: "No email",
        description: "Please enter your email first.",
        variant: "destructive",
      });
      return;
    }
    try {
      await sendOtp({ email: targetEmail }).unwrap();
      setForgotEmail(targetEmail);
      toast({
        title: "Code resent",
        description: `We sent another code to ${targetEmail}.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to resend",
        description:
          err?.data?.message ||
          err?.message ||
          "Unable to resend code. Please try again later.",
        variant: "destructive",
      });
    }
  };

  // 3) Reset password — ensure we send { email, otp, newPassword } (API maps password too)
  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please re-enter.",
        variant: "destructive",
      });
      return;
    }

    const emailToSend = forgotEmail || getValues("email") || email;
    if (!emailToSend) {
      toast({
        title: "Missing email",
        description: "Email is required to reset the password.",
        variant: "destructive",
      });
      return;
    }
    if (otp.trim().length !== 6) {
      toast({
        title: "Invalid code",
        description: "Enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    try {
      await resetPasswordUsingOtp({
        email: emailToSend,
        otp,
        newPassword,
      }).unwrap();

      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });

      // reset modal state
      setForgotOpen(false);
      setForgotStep("email");
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setForgotEmail("");
      reset();
    } catch (err: any) {
      toast({
        title: "Failed to update password",
        description:
          err?.data?.message ||
          err?.message ||
          "Unable to update password. Please check the code and try again.",
        variant: "destructive",
      });
    }
  };

  // Main submit: dispatch login thunk
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    try {
      await dispatch(login({ email, password })).unwrap();
    } catch (err: any) {
      const msg =
        err?.message || (typeof err === "string" ? err : "Login failed");
      toast({
        title: "Sign in failed",
        description: msg,
        variant: "destructive",
      });
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* FORGOT PASSWORD DIALOG - moved OUTSIDE the login form */}
          <div className="text-center text-sm mt-3">
            <Dialog
              open={forgotOpen}
              onOpenChange={(open) => {
                setForgotOpen(open);
                if (open) {
                  // Prefill forgot-email with login email when modal opens
                  reset({ email: email ?? "" });
                } else {
                  // Reset modal when closing
                  setForgotStep("email");
                  setOtp("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setForgotEmail("");
                  reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-normal"
                >
                  Forgot your password?
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  {forgotStep === "email" && (
                    <>
                      <DialogTitle>Reset your password</DialogTitle>
                      <DialogDescription>
                        Enter your email address to receive a verification code.
                      </DialogDescription>
                    </>
                  )}
                  {forgotStep === "otp" && (
                    <>
                      <DialogTitle>Enter verification code</DialogTitle>
                      <DialogDescription>
                        We sent a 6-digit code to your email. Enter it below to
                        continue.
                      </DialogDescription>
                    </>
                  )}
                  {forgotStep === "reset" && (
                    <>
                      <DialogTitle>Create a new password</DialogTitle>
                      <DialogDescription>
                        Set a strong password you haven't used before.
                      </DialogDescription>
                    </>
                  )}
                </DialogHeader>

                {forgotStep === "email" && (
                  <form
                    onSubmit={(e) => {
                      e.stopPropagation();
                      handleForgotSubmit(onForgotSubmit)(e as any);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          {...register("email")}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-destructive">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setForgotOpen(false);
                          setForgotStep("email");
                          reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || sendingOtp}
                      >
                        {sendingOtp ? "Sending..." : "Send code"}
                      </Button>
                    </div>
                  </form>
                )}

                {forgotStep === "otp" && (
                  <form
                    onSubmit={(e) => {
                      e.stopPropagation();
                      onVerifyOtp(e);
                    }}
                    className="space-y-4"
                  >
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <button
                        type="button"
                        className="underline underline-offset-4"
                        onClick={handleResendCode}
                        disabled={
                          sendingOtp ||
                          !(forgotEmail || getValues("email") || email)
                        }
                      >
                        {sendingOtp ? "Resending..." : "Resend code"}
                      </button>
                      <button
                        type="button"
                        className="underline underline-offset-4"
                        onClick={() => {
                          setForgotStep("email");
                          reset();
                        }}
                      >
                        Change email
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setForgotStep("email")}
                      >
                        Back
                      </Button>
                      <Button type="submit">Verify code</Button>
                    </div>
                  </form>
                )}

                {forgotStep === "reset" && (
                  <form
                    onSubmit={(e) => {
                      e.stopPropagation();
                      onResetPassword(e);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-new-password">
                        Confirm new password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirm-new-password"
                          type={showConfirmNewPassword ? "text" : "password"}
                          placeholder="Re-enter new password"
                          value={confirmNewPassword}
                          onChange={(e) =>
                            setConfirmNewPassword(e.target.value)
                          }
                          className="pl-10 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmNewPassword(!showConfirmNewPassword)
                          }
                        >
                          {showConfirmNewPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setForgotStep("otp")}
                      >
                        Back
                      </Button>
                      <Button type="submit" disabled={resettingPassword}>
                        {resettingPassword ? "Updating..." : "Update password"}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            <div className="mt-4">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
