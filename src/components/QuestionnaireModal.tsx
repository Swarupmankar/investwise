import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";
import InvestorQuestionnaire from "@/components/InvestorQuestionnaire";

interface QuestionnaireModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const QuestionnaireModal = ({ isOpen, onComplete }: QuestionnaireModalProps) => {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    // Allow skipping after 10 seconds
    if (isOpen) {
      const timer = setTimeout(() => setCanSkip(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleQuestionnaireComplete = (data: any) => {
    // Store completion in localStorage
    localStorage.setItem('questionnaireCompleted', 'true');
    localStorage.setItem('questionnaireData', JSON.stringify(data));
    onComplete();
  };

  const handleSkip = () => {
    // Mark as skipped but not completed
    localStorage.setItem('questionnaireSkipped', 'true');
    onComplete();
  };

  if (showQuestionnaire) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent
          hideClose
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        >
          <div className="p-6">
            <InvestorQuestionnaire 
              onComplete={handleQuestionnaireComplete}
              onBack={() => setShowQuestionnaire(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        hideClose
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-md"
      >
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Welcome to Your Investment Journey
          </DialogTitle>
          <DialogDescription className="text-base">
            To ensure compliance with financial regulations and provide you with the best investment experience, please complete our investor questionnaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning mb-1">Regulatory Requirement</p>
                <p className="text-muted-foreground">
                  This questionnaire helps us understand your investment profile and ensures we provide suitable investment recommendations.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => setShowQuestionnaire(true)}
              className="w-full gradient-primary text-white py-3"
            >
              Complete Questionnaire (3 minutes)
            </Button>
     
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionnaireModal;