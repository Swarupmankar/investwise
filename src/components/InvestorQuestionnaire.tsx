import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface QuestionnaireData {
  fullName: string;
  address: string;
  dateOfBirth: Date | undefined;
  email: string;
  phone: string;
  annualIncome: string;
  previousInvestments: string;
  investmentExperience: string;
  occupation: string;
  initialInvestment: string;
  investmentTimeline: string;
  investmentGoal: string;
  investmentDuration: string;
  fundsSource: string;
  education: string;
  referralSource: string;
  referralInterest: string;
  cryptoFamiliarity: string;
  fundsControl: string;
  cryptoWallet: string;
}

interface InvestorQuestionnaireProps {
  onComplete: (data: QuestionnaireData) => void;
  onBack: () => void;
}

const InvestorQuestionnaire = ({ onComplete, onBack }: InvestorQuestionnaireProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const [formData, setFormData] = useState<QuestionnaireData>({
    fullName: "",
    address: "",
    dateOfBirth: undefined,
    email: "",
    phone: "",
    annualIncome: "",
    previousInvestments: "",
    investmentExperience: "",
    occupation: "",
    initialInvestment: "",
    investmentTimeline: "",
    investmentGoal: "",
    investmentDuration: "",
    fundsSource: "",
    education: "",
    referralSource: "",
    referralInterest: "",
    cryptoFamiliarity: "",
    fundsControl: "",
    cryptoWallet: ""
  });

  const handleInputChange = (field: keyof QuestionnaireData, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">1. What is your full legal name as per official records?</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => handleInputChange("fullName", e.target.value)}
          placeholder="Enter your full legal name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">2. What is your complete address as mentioned in your official identification document?</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange("address", e.target.value)}
          placeholder="Enter your complete address"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>3. What is your date of birth as per your official identification documents?</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.dateOfBirth && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.dateOfBirth ? format(formData.dateOfBirth, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.dateOfBirth}
              onSelect={(date) => handleInputChange("dateOfBirth", date)}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">4. What is your primary email address for official communication?</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          placeholder="Enter your email address"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">5. What is your active contact number for communication purposes?</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          placeholder="Enter your phone number"
          required
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>6. What is your approximate annual income (in USD)?</Label>
        <Select value={formData.annualIncome} onValueChange={(value) => handleInputChange("annualIncome", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your annual income range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="less-25k">Less than $25,000</SelectItem>
            <SelectItem value="25k-75k">$25,000 – $75,000</SelectItem>
            <SelectItem value="75k-150k">$75,001 – $150,000</SelectItem>
            <SelectItem value="above-150k">Above $150,000</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>7. Have you previously invested in any financial assets or instruments?</Label>
        <Select value={formData.previousInvestments} onValueChange={(value) => handleInputChange("previousInvestments", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your investment history" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="regular-multiple">Yes, I have regularly invested in multiple asset classes</SelectItem>
            <SelectItem value="occasional-selected">Yes, occasionally in selected asset types</SelectItem>
            <SelectItem value="planning-start">No, but I am planning to start now</SelectItem>
            <SelectItem value="never-invested">No, I have never invested before</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>8. How much experience do you have with investing?</Label>
        <Select value={formData.investmentExperience} onValueChange={(value) => handleInputChange("investmentExperience", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-experience">No experience at all</SelectItem>
            <SelectItem value="less-1-year">Less than 1 year</SelectItem>
            <SelectItem value="1-3-years">1 to 3 years</SelectItem>
            <SelectItem value="more-3-years">More than 3 years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>9. What is your current occupation?</Label>
        <Select value={formData.occupation} onValueChange={(value) => handleInputChange("occupation", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your occupation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salaried">Salaried (Private/Government Sector)</SelectItem>
            <SelectItem value="self-employed">Self-Employed / Business Owner</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="homemaker">Homemaker</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>10. How much are you planning to invest with us initially?</Label>
        <Select value={formData.initialInvestment} onValueChange={(value) => handleInputChange("initialInvestment", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select initial investment amount" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1k-5k">$1,000 – $4,999</SelectItem>
            <SelectItem value="5k-10k">$5,000 – $9,999</SelectItem>
            <SelectItem value="10k-25k">$10,000 – $24,999</SelectItem>
            <SelectItem value="25k-50k">$25,000 – $49,999</SelectItem>
            <SelectItem value="50k-100k">$50,000 – $99,999</SelectItem>
            <SelectItem value="100k-plus">$100,000 and above</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>11. How soon are you willing to make your first investment with us?</Label>
        <Select value={formData.investmentTimeline} onValueChange={(value) => handleInputChange("investmentTimeline", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select investment timeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immediately">Immediately</SelectItem>
            <SelectItem value="within-1-week">Within 1 week</SelectItem>
            <SelectItem value="within-1-month">Within 1 month</SelectItem>
            <SelectItem value="not-sure">Not sure yet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>12. What is the primary goal behind your decision to invest with us?</Label>
        <Select value={formData.investmentGoal} onValueChange={(value) => handleInputChange("investmentGoal", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your investment goal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wealth-creation">Wealth creation over the long term</SelectItem>
            <SelectItem value="passive-income">Earning consistent passive income</SelectItem>
            <SelectItem value="specific-goal">Saving for a specific life goal</SelectItem>
            <SelectItem value="diversification">Diversifying existing portfolio</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>13. How long are you willing to invest?</Label>
        <Select value={formData.investmentDuration} onValueChange={(value) => handleInputChange("investmentDuration", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select investment duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="less-6-months">Less than 6 months</SelectItem>
            <SelectItem value="6-months-1-year">6 months – 1 year</SelectItem>
            <SelectItem value="1-3-years">1 to 3 years</SelectItem>
            <SelectItem value="more-3-years">More than 3 years</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>14. What would be the source of the funds you are planning to invest?</Label>
        <Select value={formData.fundsSource} onValueChange={(value) => handleInputChange("fundsSource", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select funds source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salary">Salary / Employment Income</SelectItem>
            <SelectItem value="business">Business Income</SelectItem>
            <SelectItem value="passive">Rental or Passive Income</SelectItem>
            <SelectItem value="asset-sale">Sale of Assets or Investments</SelectItem>
            <SelectItem value="inheritance">Inheritance or Gift</SelectItem>
            <SelectItem value="savings">Personal Savings</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>15. What is your highest level of educational qualification?</Label>
        <Select value={formData.education} onValueChange={(value) => handleInputChange("education", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select education level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high-school">High School or Equivalent</SelectItem>
            <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
            <SelectItem value="masters">Master's Degree</SelectItem>
            <SelectItem value="doctorate">Doctorate (Ph.D. or equivalent)</SelectItem>
            <SelectItem value="professional">Professional Certification</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>16. How did you hear about our investment platform?</Label>
        <Select value={formData.referralSource} onValueChange={(value) => handleInputChange("referralSource", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select referral source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="financial-advisor">Through a financial advisor</SelectItem>
            <SelectItem value="referral">Referral from a friend or family member</SelectItem>
            <SelectItem value="social-media">Social media or online advertisement</SelectItem>
            <SelectItem value="seminar">Investment seminar or webinar</SelectItem>
            <SelectItem value="news">News or media coverage</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>17. Would you be willing to earn additional income by referring our platform to others?</Label>
        <Select value={formData.referralInterest} onValueChange={(value) => handleInputChange("referralInterest", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your interest in referrals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes-absolutely">Yes, absolutely</SelectItem>
            <SelectItem value="maybe">Maybe, I'd like to know more</SelectItem>
            <SelectItem value="not-interested">No, not interested</SelectItem>
            <SelectItem value="already-referring">Already referring</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>18. Are you familiar with cryptocurrency transfers?</Label>
        <Select value={formData.cryptoFamiliarity} onValueChange={(value) => handleInputChange("cryptoFamiliarity", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your crypto familiarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fully-comfortable">Yes, I'm fully comfortable with crypto transfers</SelectItem>
            <SelectItem value="occasionally">I've used them occasionally and can manage</SelectItem>
            <SelectItem value="need-assistance">I've heard of them but need assistance</SelectItem>
            <SelectItem value="not-familiar">No, I'm not familiar at all</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>19. Can you confirm that you are the sole controller of your funds and crypto wallet?</Label>
        <Select value={formData.fundsControl} onValueChange={(value) => handleInputChange("fundsControl", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Confirm funds control" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sole-controller">Yes, I confirm I am the sole controller</SelectItem>
            <SelectItem value="joint-management">I manage it jointly with someone I fully trust</SelectItem>
            <SelectItem value="need-guidance">I'm unsure and need guidance</SelectItem>
            <SelectItem value="someone-helping">Someone else is helping me manage my funds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>20. Which cryptocurrency wallet or exchange do you currently use?</Label>
        <Select value={formData.cryptoWallet} onValueChange={(value) => handleInputChange("cryptoWallet", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your crypto wallet/exchange" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="binance">Binance</SelectItem>
            <SelectItem value="ledger">Ledger</SelectItem>
            <SelectItem value="bybit">Bybit</SelectItem>
            <SelectItem value="bitget">Bitget</SelectItem>
            <SelectItem value="trust-wallet">Trust Wallet</SelectItem>
            <SelectItem value="metamask">MetaMask</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Investor Onboarding Questionnaire</CardTitle>
        <CardDescription>
          Step {currentStep} of {totalSteps} - Please provide accurate information for compliance purposes
        </CardDescription>
        <div className="w-full bg-muted rounded-full h-2 mt-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          
          <div className="flex justify-between gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {currentStep === 1 ? "Back to Registration" : "Previous"}
            </Button>
            
            <Button 
              type="button" 
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              {currentStep === totalSteps ? "Complete Registration" : "Next"}
              {currentStep !== totalSteps && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestorQuestionnaire;