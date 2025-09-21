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
// ← adjust import path to where your slice exports `login`

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { toast } = useToast();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset">(
    "email"
  );
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Redux
  const dispatch: any = useDispatch(); // replace `any` with AppDispatch / typed hook if available
  const auth = useSelector((state: any) => state.auth); // replace `any` with RootState / typed hook if available
  const { isLoading, isError, error, isAuthenticated, user } = auth || {};

  const navigate = useNavigate();

  // react-hook-form for forgot password modal
  const forgotSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
  });
  type ForgotInputs = z.infer<typeof forgotSchema>;

  const {
    register,
    handleSubmit: handleForgotSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotInputs>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  // Handle login side effects (success/error)
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
      // navigate to protected area; adjust route as needed
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate, toast, user]);

  // Forgot password flow handlers (kept as before)
  const onForgotSubmit = async (data: ForgotInputs) => {
    console.log("Forgot password request:", data);
    toast({
      title: "Verification code sent",
      description: "Enter the 6-digit code we sent to your email.",
    });
    setForgotStep("otp");
  };

  const onVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code.",
        variant: "destructive",
      });
      return;
    }
    setForgotStep("reset");
  };

  const onResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
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
    toast({
      title: "Password updated",
      description: "You can now sign in with your new password.",
    });
    setForgotOpen(false);
    setForgotStep("email");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    reset();
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
      // your thunk expects { username, password } — adapt if it's { email, password }
      await dispatch(login({ email, password })).unwrap();
      // navigation and success toast happen in useEffect when isAuthenticated changes
    } catch (err: any) {
      // thunk rejection also triggers isError; show fallback toast here as well
      const msg =
        err?.message || (typeof err === "string" ? err : "Login failed");
      toast({
        title: "Sign in failed",
        description: msg,
        variant: "destructive",
      });
      // Optionally clear password field
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

            <div className="text-center text-sm">
              <Dialog
                open={forgotOpen}
                onOpenChange={(open) => {
                  setForgotOpen(open);
                  if (!open) {
                    setForgotStep("email");
                    setOtp("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="link" className="p-0 h-auto font-normal">
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    {forgotStep === "email" && (
                      <>
                        <DialogTitle>Reset your password</DialogTitle>
                        <DialogDescription>
                          Enter your email address to receive a verification
                          code.
                        </DialogDescription>
                      </>
                    )}
                    {forgotStep === "otp" && (
                      <>
                        <DialogTitle>Enter verification code</DialogTitle>
                        <DialogDescription>
                          We sent a 6-digit code to your email. Enter it below
                          to continue.
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
                      onSubmit={handleForgotSubmit(onForgotSubmit)}
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
                          onClick={() => setForgotOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          Send code
                        </Button>
                      </div>
                    </form>
                  )}

                  {forgotStep === "otp" && (
                    <form onSubmit={onVerifyOtp} className="space-y-4">
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
                          onClick={() =>
                            toast({
                              title: "Code resent",
                              description:
                                "We sent another code to your email.",
                            })
                          }
                        >
                          Resend code
                        </button>
                        <button
                          type="button"
                          className="underline underline-offset-4"
                          onClick={() => setForgotStep("email")}
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
                    <form onSubmit={onResetPassword} className="space-y-4">
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
                        <Button type="submit">Update password</Button>
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
