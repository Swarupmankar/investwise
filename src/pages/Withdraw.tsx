import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Wallet, ArrowUpFromLine, Clock, CheckCircle, XCircle, TrendingUp, Users, Target, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestmentStore } from "@/hooks/useInvestmentStore";
import WithdrawalVerification from "@/components/WithdrawalVerification";

export default function Withdraw() {
  const { user, withdrawals, createWithdrawal, uploadWithdrawalScreenshot, completeWithdrawalVerification } = useInvestmentStore();
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [investmentWithdrawAmount, setInvestmentWithdrawAmount] = useState("");
  const [referralWithdrawAmount, setReferralWithdrawAmount] = useState("");
  const [principalWithdrawAmount, setPrincipalWithdrawAmount] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [currentStep, setCurrentStep] = useState({
    investment: 1,
    referral: 1,
    principal: 1
  });
  const [customAmount, setCustomAmount] = useState({
    investment: false,
    referral: false,
    principal: false
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: "bg-success/10 text-success border-success/20",
      pending_admin_approval: "bg-muted/10 text-muted-foreground border-muted/20",
      admin_approved: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      verification_pending: "bg-warning/10 text-warning border-warning/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return variants[status as keyof typeof variants] || "bg-muted text-muted-foreground border-border";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const generateWithdrawalOptions = (balance: number) => {
    const options = [];
    const increments = [50, 100, 250, 500, 1000, 2500, 5000];
    
    for (const increment of increments) {
      if (increment <= balance) {
        options.push({ value: increment.toString(), label: `$${increment.toLocaleString()}` });
      }
    }
    
    if (balance > 10) {
      options.push({ value: balance.toString(), label: `$${balance.toLocaleString()} (Max Available)` });
    }
    
    options.push({ value: "custom", label: "Custom Amount" });
    
    return options;
  };

  const WithdrawalForm = ({ 
    title, 
    balance, 
    amount, 
    setAmount, 
    icon: Icon, 
    gradientColor, 
    iconBg,
    formType 
  }: {
    title: string;
    balance: number;
    amount: string;
    setAmount: (value: string) => void;
    icon: any;
    gradientColor: string;
    iconBg: string;
    formType: 'investment' | 'referral' | 'principal';
  }) => {
    const withdrawalOptions = generateWithdrawalOptions(balance);
    const step = currentStep[formType];
    
    return (
      <div className="space-y-6">
        {/* Available Balance */}
        <div className={cn("card-premium p-6 relative overflow-hidden", gradientColor)}>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-3xl font-bold text-foreground">${balance.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Ready to Withdraw</p>
              </div>
              <div className={cn("h-16 w-16 rounded-full flex items-center justify-center", iconBg)}>
                <Icon className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal Request Form */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-foreground">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="h-5 w-5" />
                {title} Withdrawal
              </div>
              <div className="text-sm text-muted-foreground">
                Step {step} of 2
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 ? (
              <>
                {/* Step 1: Wallet Address and Amount */}
                <div className="space-y-2">
                  <Label>USDT Wallet Address (TRC20)</Label>
                  <Input 
                    value={withdrawalAddress}
                    onChange={(e) => setWithdrawalAddress(e.target.value)}
                    placeholder="Enter your USDT wallet address"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ensure this is a valid TRC20 USDT address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Withdrawal Amount</Label>
                  <Select 
                    value={amount === "" ? "" : withdrawalOptions.find(opt => opt.value === amount)?.value || "custom"}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setCustomAmount(prev => ({ ...prev, [formType]: true }));
                        setAmount("");
                      } else {
                        setCustomAmount(prev => ({ ...prev, [formType]: false }));
                        setAmount(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select withdrawal amount" />
                    </SelectTrigger>
                    <SelectContent>
                      {withdrawalOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {customAmount[formType] && (
                    <div className="relative">
                      <Input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter custom amount"
                        className="pr-16"
                        max={balance}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        USDT
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimum: $10</span>
                    <span>Available: ${balance.toLocaleString()}</span>
                  </div>
                </div>

                <Button 
                  className="w-full gradient-primary text-white"
                  disabled={!withdrawalAddress || !amount || parseFloat(amount) > balance || parseFloat(amount) < 10}
                  onClick={() => {
                    setCurrentStep(prev => ({ ...prev, [formType]: 2 }));
                  }}
                >
                  Continue to 2FA Verification
                </Button>
              </>
            ) : (
              <>
                {/* Step 2: 2FA Verification with Summary */}
                <div className="space-y-4">
                  {/* Withdrawal Summary */}
                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <h4 className="font-semibold text-foreground mb-3">Withdrawal Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-semibold text-foreground">${parseFloat(amount).toLocaleString()} USDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To Address:</span>
                        <span className="font-mono text-xs text-foreground break-all">
                          {withdrawalAddress.slice(0, 20)}...{withdrawalAddress.slice(-10)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Source:</span>
                        <span className="text-foreground">{title}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2FA Input */}
                  <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
                    <Label className="flex items-center gap-2 text-lg font-semibold">
                      <Shield className="h-5 w-5" />
                      2FA Code (Required)
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP 
                        maxLength={6} 
                        value={twoFactorCode} 
                        onChange={setTwoFactorCode}
                        containerClassName="gap-4"
                      >
                        <InputOTPGroup className="gap-4">
                          <InputOTPSlot index={0} className="h-14 w-14 text-lg font-semibold border-2 rounded-lg" />
                          <InputOTPSlot index={1} className="h-14 w-14 text-lg font-semibold border-2 rounded-lg" />
                          <InputOTPSlot index={2} className="h-14 w-14 text-lg font-semibold border-2 rounded-lg" />
                          <InputOTPSlot index={3} className="h-14 w-14 text-lg font-semibold border-2 rounded-lg" />
                          <InputOTPSlot index={4} className="h-14 w-14 text-lg font-semibold border-2 rounded-lg" />
                          <InputOTPSlot index={5} className="h-14 w-14 text-lg font-semibold border-2 rounded-lg" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your 6-digit 2FA code to authorize the withdrawal
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCurrentStep(prev => ({ ...prev, [formType]: 1 }));
                        setTwoFactorCode("");
                      }}
                    >
                      Back
                    </Button>
                    <Button 
                      className="flex-2 gradient-primary text-white"
                      disabled={twoFactorCode.length !== 6}
                      onClick={() => {
                        const source = title.includes("Investment Returns") ? "return" : 
                                     title.includes("Referral") ? "referral" : "principal";
                        const result = createWithdrawal(
                          parseFloat(amount), 
                          source as "return" | "referral" | "principal", 
                          withdrawalAddress,
                          twoFactorCode
                        );
                        if (typeof result === 'object' && result.success) {
                          setAmount("");
                          setWithdrawalAddress("");
                          setTwoFactorCode("");
                          setCustomAmount(prev => ({ ...prev, [formType]: false }));
                          setCurrentStep(prev => ({ ...prev, [formType]: 1 }));
                        } else if (typeof result === 'object' && !result.success) {
                          // Error handling is already done in createWithdrawal via toast
                        } else {
                          setAmount("");
                          setWithdrawalAddress("");
                          setTwoFactorCode("");
                          setCustomAmount(prev => ({ ...prev, [formType]: false }));
                          setCurrentStep(prev => ({ ...prev, [formType]: 1 }));
                        }
                      }}
                    >
                      Submit Withdrawal Request
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const WithdrawalHistory = ({ withdrawals, type }: { withdrawals: any[], type: string }) => {
    const pendingUploadsCount = withdrawals.filter(w => w.status === "admin_approved" && !w.screenshotUrl).length;
    
    return (
      <div className="space-y-4">
        {/* Pending Verifications */}
        {withdrawals.filter(w => w.status === 'pending_admin_approval' || w.status === 'admin_approved' || w.status === 'verification_pending').map((withdrawal) => (
          <WithdrawalVerification
            key={withdrawal.id}
            withdrawal={withdrawal}
            onUploadScreenshot={uploadWithdrawalScreenshot}
            onVerificationComplete={completeWithdrawalVerification}
            pendingUploadsCount={pendingUploadsCount}
          />
        ))}
      
      {/* Historical Withdrawals */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-foreground">{type} Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {withdrawals.filter(w => w.status === 'approved' || w.status === 'rejected').length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No completed withdrawals yet</p>
            ) : (
              withdrawals.filter(w => w.status === 'approved' || w.status === 'rejected').map((withdrawal) => (
                <div key={withdrawal.id} className="p-4 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(withdrawal.status)}
                        <span className="font-bold text-foreground">
                          ${withdrawal.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Badge className={cn("border", getStatusBadge(withdrawal.status))}>
                      {withdrawal.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Date: {withdrawal.requestDate}</p>
                    <p className="text-muted-foreground font-mono">ID: {withdrawal.id}</p>
                    <p className="text-muted-foreground font-mono break-all">
                      To: {withdrawal.walletAddress.slice(0, 20)}...
                    </p>
                    {withdrawal.processedDate && (
                      <p className="text-muted-foreground">Processed: {withdrawal.processedDate}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Withdraw Funds</h1>
          <p className="text-muted-foreground text-lg">Withdraw your investment returns, referral earnings, and principal</p>
        </div>
      </div>

      {/* Tabbed Withdrawal Interface */}
      <Tabs defaultValue="investment" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger 
            value="investment" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3 px-4 font-medium transition-all"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Investment Returns
          </TabsTrigger>
          <TabsTrigger 
            value="referral"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3 px-4 font-medium transition-all"
          >
            <Users className="h-4 w-4 mr-2" />
            Referral Earnings
          </TabsTrigger>
          <TabsTrigger 
            value="principal"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3 px-4 font-medium transition-all"
          >
            <Target className="h-4 w-4 mr-2" />
            Investment Principal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WithdrawalForm
              title="Investment Returns"
              balance={user.investmentReturnBalance}
              amount={investmentWithdrawAmount}
              setAmount={setInvestmentWithdrawAmount}
              icon={TrendingUp}
              gradientColor="bg-gradient-to-br from-success/5 to-success/10"
              iconBg="bg-success/10 text-success"
              formType="investment"
            />
            <WithdrawalHistory 
              withdrawals={withdrawals.filter(w => w.source === "return")} 
              type="Investment Returns" 
            />
          </div>
        </TabsContent>

        <TabsContent value="referral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WithdrawalForm
              title="Referral Earnings"
              balance={user.referralEarnings}
              amount={referralWithdrawAmount}
              setAmount={setReferralWithdrawAmount}
              icon={Users}
              gradientColor="bg-gradient-to-br from-purple-500/5 to-purple-600/10"
              iconBg="bg-purple-500/10 text-purple-600"
              formType="referral"
            />
            <WithdrawalHistory 
              withdrawals={withdrawals.filter(w => w.source === "referral")} 
              type="Referral Earnings" 
            />
          </div>
        </TabsContent>

        <TabsContent value="principal" className="space-y-6">
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-warning rounded-full mt-2"></div>
                <div>
                  <p className="font-semibold text-warning mb-2">Important Notice</p>
                  <p className="text-sm text-muted-foreground">
                    Investment principal can only be withdrawn from your main wallet balance. 
                    To withdraw invested funds, you must first close mature investments from the Dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WithdrawalForm
              title="Investment Principal"
              balance={user.walletBalance}
              amount={principalWithdrawAmount}
              setAmount={setPrincipalWithdrawAmount}
              icon={Target}
              gradientColor="bg-gradient-to-br from-blue-500/5 to-blue-600/10"
              iconBg="bg-blue-500/10 text-blue-600"
              formType="principal"
            />
            <WithdrawalHistory 
              withdrawals={withdrawals.filter(w => w.source === "principal")} 
              type="Investment Principal" 
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}