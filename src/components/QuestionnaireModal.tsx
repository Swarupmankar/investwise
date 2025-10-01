// QuestionnaireModal.tsx
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";
import InvestorQuestionnaire, {
  QuestionnaireData,
} from "@/components/InvestorQuestionnaire";
import { useSaveAnswersMutation } from "@/API/onbording.api";
import { useToast } from "@/hooks/use-toast";
interface QuestionnaireModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const QUESTION_LABELS: Record<number, string> = {
  1: "Full legal name",
  2: "Complete address",
  3: "Date of birth",
  4: "Primary email",
  5: "Phone number",
  6: "Annual income",
  7: "Previous investments",
  8: "Investment experience",
  9: "Occupation",
  10: "Initial investment",
  11: "Investment timeline",
  12: "Investment goal",
  13: "Investment duration",
  14: "Source of funds",
  15: "Education level",
  16: "Referral source",
  17: "Referral interest",
  18: "Crypto familiarity",
  19: "Funds control confirmation",
  20: "Crypto wallet/exchange",
};

const requiredQuestionIds = Object.keys(QUESTION_LABELS).map((k) => Number(k));

const QuestionnaireModal = ({
  isOpen,
  onComplete,
}: QuestionnaireModalProps) => {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [latestFormData, setLatestFormData] =
    useState<QuestionnaireData | null>(null);
  const [modalErrors, setModalErrors] = useState<string[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [jumpToStep, setJumpToStep] = useState<number | undefined>(undefined);
  const [invalidQuestionIds, setInvalidQuestionIds] = useState<number[]>([]);
  const [focusSignal, setFocusSignal] = useState(0);

  const { toast } = useToast();
  const [saveAnswers, { isLoading: mutationLoading }] =
    useSaveAnswersMutation();
  const submittingRef = useRef(false);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const t = window.setTimeout(() => setCanSkip(true), 10000);
      return () => window.clearTimeout(t);
    } else {
      setShowQuestionnaire(false);
      setModalErrors(null);
      setSaveError(null);
      setLatestFormData(null);
      setJumpToStep(undefined);
      setInvalidQuestionIds([]);
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  const buildAnswersPayload = (formData: QuestionnaireData) => ({
    answers: requiredQuestionIds.map((id) => {
      const fieldMap: Record<number, keyof QuestionnaireData> = {
        1: "fullName",
        2: "address",
        3: "dateOfBirth",
        4: "email",
        5: "phone",
        6: "annualIncome",
        7: "previousInvestments",
        8: "investmentExperience",
        9: "occupation",
        10: "initialInvestment",
        11: "investmentTimeline",
        12: "investmentGoal",
        13: "investmentDuration",
        14: "fundsSource",
        15: "education",
        16: "referralSource",
        17: "referralInterest",
        18: "cryptoFamiliarity",
        19: "fundsControl",
        20: "cryptoWallet",
      };
      const key = fieldMap[id];
      const val = (formData as any)[key];
      return {
        questionId: id,
        answer:
          key === "dateOfBirth" && val
            ? new Date(val).toISOString()
            : val ?? "",
      };
    }),
  });

  const findMissingQuestions = (formData: QuestionnaireData | null) => {
    if (!formData)
      return requiredQuestionIds.map((id) => ({
        questionId: id,
        label: QUESTION_LABELS[id],
      }));

    const map: Record<number, keyof QuestionnaireData> = {
      1: "fullName",
      2: "address",
      3: "dateOfBirth",
      4: "email",
      5: "phone",
      6: "annualIncome",
      7: "previousInvestments",
      8: "investmentExperience",
      9: "occupation",
      10: "initialInvestment",
      11: "investmentTimeline",
      12: "investmentGoal",
      13: "investmentDuration",
      14: "fundsSource",
      15: "education",
      16: "referralSource",
      17: "referralInterest",
      18: "cryptoFamiliarity",
      19: "fundsControl",
      20: "cryptoWallet",
    };

    const missing: { questionId: number; label: string }[] = [];
    for (const id of requiredQuestionIds) {
      const field = map[id];
      const val = (formData as any)[field];
      const isEmpty =
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "");
      if (isEmpty) missing.push({ questionId: id, label: QUESTION_LABELS[id] });
    }
    return missing;
  };

  const handleDataChange = (data: QuestionnaireData) => {
    setLatestFormData(data);
    if (modalErrors) setModalErrors(null);
    if (saveError) setSaveError(null);
    // clear invalid highlights while typing
    if (invalidQuestionIds.length) setInvalidQuestionIds([]);
  };

  const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
    if (submittingRef.current || mutationLoading) return;
    submittingRef.current = true;

    const missing = findMissingQuestions(data);
    if (missing.length > 0) {
      const missingList = missing.map((m) => `${m.questionId}. ${m.label}`);
      setModalErrors(missingList);

      // set invalid highlights and jump to first missing
      const ids = missing.map((m) => m.questionId);
      setInvalidQuestionIds(ids);
      setFocusSignal((s) => s + 1);

      const firstMissing = ids[0];
      const stepForMissing = Math.ceil(firstMissing / 5);
      setJumpToStep(stepForMissing);
      setShowQuestionnaire(true);

      // toast informing the user
      toast({
        title: "All fields required",
        description: "Please fill all required fields.",
        variant: "destructive",
      });

      // scroll to top of dialog so errors are visible
      setTimeout(() => {
        if (dialogContentRef.current) dialogContentRef.current.scrollTop = 0;
      }, 90);

      submittingRef.current = false;
      return;
    }

    // submit
    setModalErrors(null);
    setSaveError(null);
    try {
      await saveAnswers(buildAnswersPayload(data)).unwrap();
      localStorage.setItem("questionnaireCompleted", "true");
      localStorage.setItem("questionnaireData", JSON.stringify(data));
      toast({
        title: "Success",
        description: "Questionnaire submitted successfully.",
        variant: "default",
      });

      // close after a short delay so toast is seen
      toastTimerRef.current = window.setTimeout(() => onComplete(), 900);
    } catch (err: any) {
      console.error("submit error:", err);
      setSaveError("Failed to submit answers. Please try again.");
      toast({
        title: "Submission failed",
        description: "Failed to submit answers. Please try again.",
        variant: "destructive",
      });
      setShowQuestionnaire(true);
    } finally {
      submittingRef.current = false;
    }
  };

  const handleSkip = () => {
    if (!latestFormData) {
      localStorage.setItem("questionnaireSkipped", "true");
      onComplete();
      return;
    }

    const missing = findMissingQuestions(latestFormData);
    if (missing.length > 0) {
      const missingList = missing.map((m) => `${m.questionId}. ${m.label}`);
      setModalErrors(missingList);
      setInvalidQuestionIds(missing.map((m) => m.questionId));
      setFocusSignal((s) => s + 1);
      const firstMissing = missing[0].questionId;
      const stepForMissing = Math.ceil(firstMissing / 5);
      setJumpToStep(stepForMissing);
      setShowQuestionnaire(true);

      toast({
        title: "All fields required",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      setTimeout(() => {
        if (dialogContentRef.current) dialogContentRef.current.scrollTop = 0;
      }, 90);
      return;
    }

    localStorage.setItem("questionnaireSkipped", "true");
    onComplete();
  };

  const handleJumpHandled = () => setJumpToStep(undefined);

  const ErrorsBlock = () => {
    if ((!modalErrors || modalErrors.length === 0) && !saveError) return null;
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-3">
        <div className="font-medium text-red-700 mb-1">
          Please address the following
        </div>
        <div className="text-sm text-red-600 space-y-1">
          {modalErrors &&
            modalErrors.map((m, idx) => <div key={idx}>• {m}</div>)}
          {saveError && <div>• {saveError}</div>}
        </div>
      </div>
    );
  };

  const isSubmitting = submittingRef.current || mutationLoading;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        hideClose
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className={
          showQuestionnaire
            ? "max-w-2xl max-h-[90vh] overflow-y-auto p-0"
            : "max-w-md"
        }
      >
        <div ref={dialogContentRef} className="p-6">
          {!showQuestionnaire ? (
            <>
              <DialogHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <DialogTitle className="text-xl font-bold">
                  Welcome to Your Investment Journey
                </DialogTitle>
                <DialogDescription className="text-base">
                  To ensure compliance with financial regulations and provide
                  you with the best investment experience, please complete our
                  investor questionnaire.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-6">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning mb-1">
                        Regulatory Requirement
                      </p>
                      <p className="text-muted-foreground">
                        This questionnaire helps us understand your investment
                        profile and ensures we provide suitable investment
                        recommendations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setShowQuestionnaire(true);
                      setModalErrors(null);
                      setSaveError(null);
                    }}
                    className="w-full gradient-primary text-white py-3"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Saving..."
                      : "Complete Questionnaire (3 minutes)"}
                  </Button>

                  {canSkip && (
                    <Button
                      variant="outline"
                      onClick={handleSkip}
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      Skip for now
                    </Button>
                  )}

                  <div className="mt-3">
                    <ErrorsBlock />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <InvestorQuestionnaire
                onComplete={handleQuestionnaireComplete}
                onBack={() => {
                  setShowQuestionnaire(false);
                  setModalErrors(null);
                }}
                onDataChange={handleDataChange}
                jumpToStep={jumpToStep}
                onJumpHandled={handleJumpHandled}
                isSubmitting={isSubmitting}
                invalidQuestionIds={invalidQuestionIds}
                focusInvalidSignal={focusSignal}
              />

              <div className="mt-4 space-y-3 px-0">
                <ErrorsBlock />
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowQuestionnaire(false)}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>

                  <div className="text-sm self-center text-muted-foreground">
                    {isSubmitting
                      ? "Saving..."
                      : "Complete the questionnaire and press 'Complete Registration' to submit"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionnaireModal;
