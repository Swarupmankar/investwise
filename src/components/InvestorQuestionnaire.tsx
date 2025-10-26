// QuestionnaireModal.tsx + InvestorQuestionnaire.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface QuestionnaireData {
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
  onDataChange?: (data: QuestionnaireData) => void;
  jumpToStep?: number;
  onJumpHandled?: () => void;
  isSubmitting?: boolean;
  invalidQuestionIds?: number[];
  focusInvalidSignal?: number;
}

const defaultFormData = (): QuestionnaireData => ({
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
  cryptoWallet: "",
});

const InvestorQuestionnaire = ({
  onComplete,
  onBack,
  onDataChange,
  jumpToStep,
  onJumpHandled,
  isSubmitting,
  invalidQuestionIds,
  focusInvalidSignal,
}: InvestorQuestionnaireProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [formData, setFormData] = useState<QuestionnaireData>(
    defaultFormData()
  );

  // Date selection state
  const [dateParts, setDateParts] = useState({
    day: "",
    month: "",
    year: "",
  });

  // Initialize date parts from formData
  useEffect(() => {
    if (formData.dateOfBirth) {
      const date = formData.dateOfBirth;
      setDateParts({
        day: date.getDate().toString(),
        month: (date.getMonth() + 1).toString(),
        year: date.getFullYear().toString(),
      });
    }
  }, []);

  // Update formData when date parts change
  useEffect(() => {
    if (dateParts.day && dateParts.month && dateParts.year) {
      const newDate = new Date(
        parseInt(dateParts.year),
        parseInt(dateParts.month) - 1,
        parseInt(dateParts.day)
      );
      if (!isNaN(newDate.getTime()) && newDate !== formData.dateOfBirth) {
        setFormData((prev) => ({ ...prev, dateOfBirth: newDate }));
      }
    } else if (formData.dateOfBirth) {
      setFormData((prev) => ({ ...prev, dateOfBirth: undefined }));
    }
  }, [dateParts, formData.dateOfBirth]);

  // Date selection helpers
  const getYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => currentYear - 17 - i);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getDays = () => {
    if (!dateParts.month || !dateParts.year) {
      return Array.from({ length: 31 }, (_, i) => i + 1);
    }
    const daysInMonth = getDaysInMonth(
      parseInt(dateParts.month),
      parseInt(dateParts.year)
    );
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const isUnder18 = () => {
    if (!formData.dateOfBirth) return false;
    const today = new Date();
    const minAgeDate = new Date();
    minAgeDate.setFullYear(today.getFullYear() - 18);
    return formData.dateOfBirth > minAgeDate;
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // apply external jumpToStep
  useEffect(() => {
    if (jumpToStep && jumpToStep >= 1 && jumpToStep <= totalSteps) {
      setCurrentStep(jumpToStep);
      setTimeout(() => {
        onJumpHandled?.();
        const container = document.querySelector(".investor-questionnaire-top");
        if (container)
          (container as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 120);
    }
  }, [jumpToStep, onJumpHandled]);

  // notify parent of data changes
  useEffect(() => {
    onDataChange?.(formData);
  }, [formData, onDataChange]);

  // when invalidQuestionIds / focusInvalidSignal change, try to focus first invalid element
  useEffect(() => {
    if (!invalidQuestionIds || invalidQuestionIds.length === 0) return;
    const first = invalidQuestionIds[0];
    const wrapper = document.querySelector(
      `[data-question-id="${first}"]`
    ) as HTMLElement | null;
    if (wrapper) {
      const focusable = wrapper.querySelector(
        'input, textarea, button, select, [role="combobox"]'
      ) as HTMLElement | null;
      focusable?.focus();
    }
  }, [invalidQuestionIds, focusInvalidSignal]);

  const handleInputChange = (
    field: keyof QuestionnaireData,
    value: string | Date | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDatePartChange = (
    part: "day" | "month" | "year",
    value: string
  ) => {
    setDateParts((prev) => ({ ...prev, [part]: value }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((cs) => cs + 1);
    } else {
      onComplete(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((cs) => cs - 1);
    else onBack();
  };

  // helpers to check invalid state for a questionId
  const isInvalid = (questionId: number) =>
    invalidQuestionIds?.includes(questionId);

  const renderStep1 = () => (
    <div className="space-y-4">
      <div data-question-id="1" className="space-y-2">
        <Label
          htmlFor="fullName"
          className={isInvalid(1) ? "text-red-600" : ""}
        >
          1. What is your full legal name as per official records?
        </Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => handleInputChange("fullName", e.target.value)}
          placeholder="Enter your full legal name"
          required
          className={cn(
            isInvalid(1) ? "border-red-500 ring-1 ring-red-500" : ""
          )}
        />
      </div>

      <div data-question-id="2" className="space-y-2">
        <Label htmlFor="address" className={isInvalid(2) ? "text-red-600" : ""}>
          2. What is your complete address as mentioned in your official
          identification document?
        </Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange("address", e.target.value)}
          placeholder="Enter your complete address"
          required
          className={cn(
            isInvalid(2) ? "border-red-500 ring-1 ring-red-500" : ""
          )}
        />
      </div>

      <div data-question-id="3" className="space-y-2">
        <Label className={cn("block mb-3", isInvalid(3) ? "text-red-600" : "")}>
          3. What is your date of birth as per your official identification
          documents?
        </Label>

        <div className="grid grid-cols-3 gap-3">
          {/* Month Selector */}
          <div className="space-y-2">
            <Select
              value={dateParts.month}
              onValueChange={(value) => handleDatePartChange("month", value)}
            >
              <SelectTrigger
                className={cn(
                  isInvalid(3) ? "border-red-500 ring-1 ring-red-500" : ""
                )}
              >
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day Selector */}
          <div className="space-y-2">
            <Select
              value={dateParts.day}
              onValueChange={(value) => handleDatePartChange("day", value)}
            >
              <SelectTrigger
                className={cn(
                  isInvalid(3) ? "border-red-500 ring-1 ring-red-500" : ""
                )}
              >
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {getDays().map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <div className="space-y-2">
            <Select
              value={dateParts.year}
              onValueChange={(value) => handleDatePartChange("year", value)}
            >
              <SelectTrigger
                className={cn(
                  isInvalid(3) ? "border-red-500 ring-1 ring-red-500" : ""
                )}
              >
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {getYears().map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Date Display */}
        {formData.dateOfBirth && (
          <div className="mt-2 p-2 bg-muted rounded-md text-sm">
            <span className="font-medium">Selected date: </span>
            {format(formData.dateOfBirth, "MMMM d, yyyy")}
          </div>
        )}

        {/* Age Validation Warning */}
        {formData.dateOfBirth && isUnder18() && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            You must be at least 18 years old to register
          </div>
        )}

        {/* Required Field Hint */}
        {!formData.dateOfBirth && isInvalid(3) && (
          <div className="mt-1 text-sm text-red-600">
            Please select your date of birth
          </div>
        )}
      </div>

      <div data-question-id="4" className="space-y-2">
        <Label htmlFor="email" className={isInvalid(4) ? "text-red-600" : ""}>
          4. What is your primary email address for official communication?
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          placeholder="Enter your email address"
          required
          className={cn(
            isInvalid(4) ? "border-red-500 ring-1 ring-red-500" : ""
          )}
        />
      </div>

      <div data-question-id="5" className="space-y-2">
        <Label htmlFor="phone" className={isInvalid(5) ? "text-red-600" : ""}>
          5. What is your active contact number for communication purposes?
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          placeholder="Enter your phone number"
          required
          className={cn(
            isInvalid(5) ? "border-red-500 ring-1 ring-red-500" : ""
          )}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div data-question-id="6" className="space-y-2">
        <Label className={isInvalid(6) ? "text-red-600" : ""}>
          6. What is your approximate annual income (in USD)?
        </Label>
        <Select
          value={formData.annualIncome}
          onValueChange={(value) => handleInputChange("annualIncome", value)}
        >
          <SelectTrigger
            className={cn(
              isInvalid(6) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
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

      <div data-question-id="7" className="space-y-2">
        <Label className={isInvalid(7) ? "text-red-600" : ""}>
          7. Have you previously invested in any financial assets or
          instruments?
        </Label>
        <Select
          value={formData.previousInvestments}
          onValueChange={(value) =>
            handleInputChange("previousInvestments", value)
          }
        >
          <SelectTrigger
            className={cn(
              isInvalid(7) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
            <SelectValue placeholder="Select your investment history" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="regular-multiple">
              Yes, I have regularly invested in multiple asset classes
            </SelectItem>
            <SelectItem value="occasional-selected">
              Yes, occasionally in selected asset types
            </SelectItem>
            <SelectItem value="planning-start">
              No, but I am planning to start now
            </SelectItem>
            <SelectItem value="never-invested">
              No, I have never invested before
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-question-id="8" className="space-y-2">
        <Label className={isInvalid(8) ? "text-red-600" : ""}>
          8. How much experience do you have with investing?
        </Label>
        <Select
          value={formData.investmentExperience}
          onValueChange={(value) =>
            handleInputChange("investmentExperience", value)
          }
        >
          <SelectTrigger
            className={cn(
              isInvalid(8) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
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

      <div data-question-id="9" className="space-y-2">
        <Label className={isInvalid(9) ? "text-red-600" : ""}>
          9. What is your current occupation?
        </Label>
        <Select
          value={formData.occupation}
          onValueChange={(value) => handleInputChange("occupation", value)}
        >
          <SelectTrigger
            className={cn(
              isInvalid(9) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
            <SelectValue placeholder="Select your occupation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salaried">
              Salaried (Private/Government Sector)
            </SelectItem>
            <SelectItem value="self-employed">
              Self-Employed / Business Owner
            </SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="homemaker">Homemaker</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-question-id="10" className="space-y-2">
        <Label className={isInvalid(10) ? "text-red-600" : ""}>
          10. How much are you planning to invest with us initially?
        </Label>
        <Select
          value={formData.initialInvestment}
          onValueChange={(value) =>
            handleInputChange("initialInvestment", value)
          }
        >
          <SelectTrigger
            className={cn(
              isInvalid(10) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
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
      <div data-question-id="11" className="space-y-2">
        <Label className={isInvalid(11) ? "text-red-600" : ""}>
          11. How soon are you willing to make your first investment with us?
        </Label>
        <Select
          value={formData.investmentTimeline}
          onValueChange={(value) =>
            handleInputChange("investmentTimeline", value)
          }
        >
          <SelectTrigger
            className={cn(
              isInvalid(11) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
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

      <div data-question-id="12" className="space-y-2">
        <Label className={isInvalid(12) ? "text-red-600" : ""}>
          12. What is the primary goal behind your decision to invest with us?
        </Label>
        <Select
          value={formData.investmentGoal}
          onValueChange={(value) => handleInputChange("investmentGoal", value)}
        >
          <SelectTrigger
            className={cn(
              isInvalid(12) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
            <SelectValue placeholder="Select your investment goal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wealth-creation">
              Wealth creation over the long term
            </SelectItem>
            <SelectItem value="passive-income">
              Earning consistent passive income
            </SelectItem>
            <SelectItem value="specific-goal">
              Saving for a specific life goal
            </SelectItem>
            <SelectItem value="diversification">
              Diversifying existing portfolio
            </SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-question-id="13" className="space-y-2">
        <Label className={isInvalid(13) ? "text-red-600" : ""}>
          13. How long are you willing to invest?
        </Label>
        <Select
          value={formData.investmentDuration}
          onValueChange={(value) =>
            handleInputChange("investmentDuration", value)
          }
        >
          <SelectTrigger
            className={cn(
              isInvalid(13) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
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

      <div data-question-id="14" className="space-y-2">
        <Label className={isInvalid(14) ? "text-red-600" : ""}>
          14. What would be the source of the funds you are planning to invest?
        </Label>
        <Select
          value={formData.fundsSource}
          onValueChange={(value) => handleInputChange("fundsSource", value)}
        >
          <SelectTrigger
            className={cn(
              isInvalid(14) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
            <SelectValue placeholder="Select funds source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salary">Salary / Employment Income</SelectItem>
            <SelectItem value="business">Business Income</SelectItem>
            <SelectItem value="passive">Rental or Passive Income</SelectItem>
            <SelectItem value="asset-sale">
              Sale of Assets or Investments
            </SelectItem>
            <SelectItem value="inheritance">Inheritance or Gift</SelectItem>
            <SelectItem value="savings">Personal Savings</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-question-id="15" className="space-y-2">
        <Label className={isInvalid(15) ? "text-red-600" : ""}>
          15. What is your highest level of educational qualification?
        </Label>
        <Select
          value={formData.education}
          onValueChange={(value) => handleInputChange("education", value)}
        >
          <SelectTrigger
            className={cn(
              isInvalid(15) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
            <SelectValue placeholder="Select education level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high-school">
              High School or Equivalent
            </SelectItem>
            <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
            <SelectItem value="masters">Master's Degree</SelectItem>
            <SelectItem value="doctorate">
              Doctorate (Ph.D. or equivalent)
            </SelectItem>
            <SelectItem value="professional">
              Professional Certification
            </SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div data-question-id="16" className="space-y-2">
        <Label className={isInvalid(16) ? "text-red-600" : ""}>
          16. How did you hear about our investment platform?
        </Label>
        <Select
          value={formData.referralSource}
          onValueChange={(value) => handleInputChange("referralSource", value)}
        >
          <SelectTrigger
            className={cn(
              isInvalid(16) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
            <SelectValue placeholder="Select referral source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="financial-advisor">
              Through a financial advisor
            </SelectItem>
            <SelectItem value="referral">
              Referral from a friend or family member
            </SelectItem>
            <SelectItem value="social-media">
              Social media or online advertisement
            </SelectItem>
            <SelectItem value="seminar">
              Investment seminar or webinar
            </SelectItem>
            <SelectItem value="news">News or media coverage</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-question-id="17" className="space-y-2">
        <Label className={isInvalid(17) ? "text-red-600" : ""}>
          17. Would you be willing to earn additional income by referring our
          platform to others?
        </Label>
        <Select
          value={formData.referralInterest}
          onValueChange={(value) =>
            handleInputChange("referralInterest", value)
          }
        >
          <SelectTrigger
            className={cn(
              isInvalid(17) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
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

      <div data-question-id="18" className="space-y-2">
        <Label className={isInvalid(18) ? "text-red-600" : ""}>
          18. Are you familiar with cryptocurrency transfers?
        </Label>
        <Select
          value={formData.cryptoFamiliarity}
          onValueChange={(value) =>
            handleInputChange("cryptoFamiliarity", value)
          }
        >
          <SelectTrigger
            className={cn(
              isInvalid(18) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
            <SelectValue placeholder="Select your crypto familiarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fully-comfortable">
              Yes, I'm fully comfortable with crypto transfers
            </SelectItem>
            <SelectItem value="occasionally">
              I've used them occasionally and can manage
            </SelectItem>
            <SelectItem value="need-assistance">
              I've heard of them but need assistance
            </SelectItem>
            <SelectItem value="not-familiar">
              No, I'm not familiar at all
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-question-id="19" className="space-y-2">
        <Label className={isInvalid(19) ? "text-red-600" : ""}>
          19. Can you confirm that you are the sole controller of your funds and
          crypto wallet?
        </Label>
        <Select
          value={formData.fundsControl}
          onValueChange={(value) => handleInputChange("fundsControl", value)}
        >
          <SelectTrigger
            className={cn(
              isInvalid(19) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
            <SelectValue placeholder="Confirm funds control" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sole-controller">
              Yes, I confirm I am the sole controller
            </SelectItem>
            <SelectItem value="joint-management">
              I manage it jointly with someone I fully trust
            </SelectItem>
            <SelectItem value="need-guidance">
              I'm unsure and need guidance
            </SelectItem>
            <SelectItem value="someone-helping">
              Someone else is helping me manage my funds
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-question-id="20" className="space-y-2">
        <Label className={isInvalid(20) ? "text-red-600" : ""}>
          20. Which cryptocurrency wallet or exchange do you currently use?
        </Label>
        <Select
          value={formData.cryptoWallet}
          onValueChange={(value) => handleInputChange("cryptoWallet", value)}
        >
          <SelectTrigger
            className={cn(
              isInvalid(20) ? "border-red-500 ring-1 ring-red-500" : ""
            )}
          >
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
    <Card className="w-full max-w-2xl mx-auto investor-questionnaire-top">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          Investor Onboarding Questionnaire
        </CardTitle>
        <CardDescription>
          Step {currentStep} of {totalSteps} - Please provide accurate
          information for compliance purposes
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
              disabled={!!isSubmitting}
            >
              <ChevronLeft className="h-4 w-4" />
              {currentStep === 1 ? "Back to Registration" : "Previous"}
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2"
              disabled={!!isSubmitting}
            >
              {currentStep === totalSteps
                ? isSubmitting
                  ? "Saving..."
                  : "Complete Registration"
                : "Next"}
              {currentStep !== totalSteps && (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestorQuestionnaire;
