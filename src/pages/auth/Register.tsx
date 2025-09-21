// src/pages/Register.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useRegisterRequestMutation,
  useVerifyOtpMutation,
} from "@/API/register.api";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification
  const [otp, setOtp] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  // RTK Query mutations
  const [registerRequest, { isLoading: isRegistering }] =
    useRegisterRequestMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();

  const buildPayload = () => ({
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    password: formData.password,
    phoneNumber: formData.phone,
    // adminId will be injected by API (hardcoded = 1)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please re-enter your password.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.acceptTerms) {
      toast({
        title: "Agree to Terms",
        description: "You must accept Terms of Service and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }

    const payload = buildPayload();

    try {
      // call register mutation; unwrap to throw on non-2xx
      const res = await registerRequest(payload).unwrap();
      // show toast and move to OTP step
      toast({
        title: "Verification code sent",
        description: `A 6-digit code has been sent to ${formData.email}`,
      });
      setStep(2);
    } catch (err: any) {
      const message = err?.data?.message || err?.error || "Registration failed";
      toast({
        title: "Registration failed",
        description: String(message),
        variant: "destructive",
      });
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    try {
      await verifyOtp({ token: otp }).unwrap();
      toast({
        title: "Account created successfully!",
        description: "Welcome! You can now sign in to your account.",
      });
      navigate("/login");
    } catch (err: any) {
      const message = err?.data?.message || err?.error || "Verification failed";
      toast({
        title: "Verification failed",
        description: String(message),
        variant: "destructive",
      });
    }
  };

  const handleResendOtp = async () => {
    const payload = buildPayload();

    try {
      await registerRequest(payload).unwrap();
      toast({
        title: "Code sent",
        description: `A new verification code has been sent to ${formData.email}`,
      });
    } catch (err: any) {
      const message =
        err?.data?.message || err?.error || "Could not resend code";
      toast({
        title: "Resend failed",
        description: String(message),
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {step === 1 ? "Create Account" : "Verify Your Email"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Join us and start your investment journey"
              : `Enter the 6-digit code sent to ${formData.email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
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
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) =>
                    handleInputChange("acceptTerms", checked as boolean)
                  }
                />
                <Label
                  htmlFor="terms"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!formData.acceptTerms || isRegistering}
              >
                Create Account
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-center block">
                    Enter verification code
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  onClick={handleOtpSubmit}
                  className="w-full"
                  disabled={otp.length !== 6 || isVerifying}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Verify & Create Account
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code?
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOtp}
                    className="text-primary hover:text-primary/90"
                    disabled={isRegistering}
                  >
                    Resend Code
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Registration
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
