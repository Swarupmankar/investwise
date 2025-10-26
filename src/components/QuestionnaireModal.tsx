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
import { Calendar } from "@/components/ui/calendar";

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

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidPhone = (value: string) => {
  const v = value.trim();
  return /^\+?\d{7,15}$/.test(v);
};

const QuestionnaireModal = ({
  isOpen,
  onComplete,
}: QuestionnaireModalProps) => {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [latestFormData, setLatestFormData] =
    useState<QuestionnaireData | null>(null);

  // Show banner only on submit attempt
  const [modalErrors, setModalErrors] = useState<string[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [jumpToStep, setJumpToStep] = useState<number | undefined>(undefined);
  const [invalidQuestionIds, setInvalidQuestionIds] = useState<number[]>([]);
  const [focusSignal, setFocusSignal] = useState(0);

  // Track touched fields & whether we've attempted submit
  const touchedIdsRef = useRef<Set<number>>(new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);
  const firstChangeSeenRef = useRef(false); // <-- ignore initial sync

  const { toast } = useToast();
  const [saveAnswers, { isLoading: mutationLoading }] =
    useSaveAnswersMutation();
  const submittingRef = useRef(false);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowQuestionnaire(false);
      setModalErrors(null);
      setSaveError(null);
      setLatestFormData(null);
      setJumpToStep(undefined);
      setInvalidQuestionIds([]);
      touchedIdsRef.current.clear();
      setShowAllErrors(false);
      firstChangeSeenRef.current = false;
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  const idToKey: Record<number, keyof QuestionnaireData> = {
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

  const keyToId = Object.fromEntries(
    Object.entries(idToKey).map(([id, key]) => [key, Number(id)])
  ) as Record<keyof QuestionnaireData, number>;

  const buildAnswersPayload = (formData: QuestionnaireData) => ({
    answers: requiredQuestionIds.map((id) => {
      const key = idToKey[id];
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

  const isEmpty = (val: any) =>
    val === undefined ||
    val === null ||
    (typeof val === "string" && val.trim() === "");

  const findMissingQuestions = (formData: QuestionnaireData | null) => {
    if (!formData)
      return requiredQuestionIds.map((id) => ({
        questionId: id,
        label: QUESTION_LABELS[id],
      }));

    const missing: { questionId: number; label: string }[] = [];
    for (const id of requiredQuestionIds) {
      const key = idToKey[id];
      const val = (formData as any)[key];
      if (isEmpty(val))
        missing.push({ questionId: id, label: QUESTION_LABELS[id] });
    }
    return missing;
  };

  const findFormatIssues = (formData: QuestionnaireData | null) => {
    const issues: { questionId: number; message: string }[] = [];
    if (!formData) return issues;

    if (
      typeof formData.email === "string" &&
      formData.email.trim() !== "" &&
      !isValidEmail(formData.email)
    ) {
      issues.push({
        questionId: 4,
        message: "4. Primary email is not a valid email address",
      });
    }
    if (
      typeof formData.phone === "string" &&
      formData.phone.trim() !== "" &&
      !isValidPhone(formData.phone)
    ) {
      issues.push({
        questionId: 5,
        message:
          "5. Phone number must be numbers only (optional +) and 7–15 digits",
      });
    }
    return issues;
  };

  const computeAllInvalidIds = (formData: QuestionnaireData | null) => {
    const missing = findMissingQuestions(formData).map((m) => m.questionId);
    const formatIssues = findFormatIssues(formData).map((f) => f.questionId);
    return Array.from(new Set([...missing, ...formatIssues])).sort(
      (a, b) => a - b
    );
  };

  const computeDisplayInvalidIds = (formData: QuestionnaireData | null) => {
    const allInvalid = computeAllInvalidIds(formData);
    if (showAllErrors) return allInvalid;
    const touched = touchedIdsRef.current;
    return allInvalid.filter((id) => touched.has(id));
  };

  // Mark touched fields:
  // - Ignore the very first onDataChange (initial sync) unless the field became non-empty.
  // - After that, mark a field touched only when its value actually changes.
  const markTouchedFromDiff = (
    prevData: QuestionnaireData | null,
    nextData: QuestionnaireData
  ) => {
    if (!firstChangeSeenRef.current) {
      // First change event (likely initial sync). Mark only non-empty fields as touched.
      for (const key of Object.keys(nextData) as (keyof QuestionnaireData)[]) {
        const val = nextData[key];
        if (!isEmpty(val)) {
          const id = keyToId[key];
          touchedIdsRef.current.add(id);
        }
      }
      firstChangeSeenRef.current = true;
      return;
    }

    // Subsequent changes: mark only the field(s) that actually changed
    if (prevData) {
      for (const key of Object.keys(nextData) as (keyof QuestionnaireData)[]) {
        const prevVal = prevData[key];
        const nextVal = nextData[key];
        if (prevVal !== nextVal) {
          const id = keyToId[key];
          touchedIdsRef.current.add(id);
        }
      }
    }
  };

  // Realtime validation while typing (only show for touched fields)
  const handleDataChange = (data: QuestionnaireData) => {
    markTouchedFromDiff(latestFormData, data);
    setLatestFormData(data);

    const idsToShow = computeDisplayInvalidIds(data);
    setInvalidQuestionIds(idsToShow);

    // Hide banner while typing
    if (modalErrors) setModalErrors(null);
    if (saveError) setSaveError(null);
  };

  const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
    if (submittingRef.current || mutationLoading) return;
    submittingRef.current = true;

    setShowAllErrors(true); // After submit attempt, show all invalids

    const missing = findMissingQuestions(data);
    const formatIssues = findFormatIssues(data);

    if (missing.length > 0 || formatIssues.length > 0) {
      const newInvalid = computeDisplayInvalidIds(data); // will now include all
      setInvalidQuestionIds(newInvalid);

      const missingList = missing.map((m) => `${m.questionId}. ${m.label}`);
      const formatList = formatIssues.map((f) => f.message);
      setModalErrors([...missingList, ...formatList]);

      const firstProblem = newInvalid[0];
      if (firstProblem) {
        const stepForMissing = Math.ceil(firstProblem / 5);
        setJumpToStep(stepForMissing);
        setFocusSignal((s) => s + 1);
      }
      setShowQuestionnaire(true);

      setTimeout(() => {
        if (dialogContentRef.current) dialogContentRef.current.scrollTop = 0;
      }, 90);

      submittingRef.current = false;
      return;
    }

    // All good: submit
    setModalErrors(null);
    setSaveError(null);
    try {
      await saveAnswers(buildAnswersPayload(data)).unwrap();
      localStorage.setItem("questionnaireCompleted", "true");
      localStorage.setItem("questionnaireData", JSON.stringify(data));
      onComplete();
    } catch (err: any) {
      console.error("submit error:", err);
      setSaveError("Failed to submit answers. Please try again.");
      setShowQuestionnaire(true);
    } finally {
      submittingRef.current = false;
    }
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
