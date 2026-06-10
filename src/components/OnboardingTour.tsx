import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight, Mic, ClipboardList, Users, BarChart3, Stethoscope, Calendar } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string;
  position: "center" | "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Aperta Health",
    description: "This guided tour will walk you through the key features of your psychiatric assessment assistant. Let's get started!",
    icon: <Stethoscope className="h-8 w-8 text-primary" />,
    position: "center"
  },
  {
    id: "recording",
    title: "Voice Recording & Transcription",
    description: "Record clinical narratives using the microphone. Voice Activity Detection (VAD) automatically pauses during silence. Supports multiple Southern African languages.",
    icon: <Mic className="h-8 w-8 text-primary" />,
    position: "center"
  },
  {
    id: "screening",
    title: "Standardized Screening Tools",
    description: "Access 5 validated instruments: GAD-7 (anxiety), PHQ-9 (depression), PCL-5 (PTSD), MMSE (cognitive), and PSQ (psychosis). Scores auto-populate MSE analysis.",
    icon: <ClipboardList className="h-8 w-8 text-primary" />,
    position: "center"
  },
  {
    id: "patients",
    title: "Patient Management",
    description: "Create and manage patient profiles with cultural background and language preferences. Track longitudinal care with assessment history.",
    icon: <Users className="h-8 w-8 text-primary" />,
    position: "center"
  },
  {
    id: "appointments",
    title: "Appointment Scheduling",
    description: "Schedule follow-ups based on treatment plan recommendations. Automated SMS reminders are sent 24 hours before appointments.",
    icon: <Calendar className="h-8 w-8 text-primary" />,
    position: "center"
  },
  {
    id: "analytics",
    title: "Clinical Analytics",
    description: "View assessment trends, risk distributions, and screening score patterns across your patient population.",
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    position: "center"
  }
];

const TOUR_STORAGE_KEY = "aperta_health_tour_completed";

export const OnboardingTour = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!tourCompleted) {
      // Small delay to let the app render first
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestart}
        className="fixed bottom-4 left-4 z-40 shadow-lg"
      >
        Restart Tour
      </Button>
    );
  }

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
      
      {/* Tour Card */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md animate-scale-in shadow-2xl border-primary/20">
          <CardHeader className="relative pb-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                {step.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </p>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-2">
            <p className="text-muted-foreground">{step.description}</p>
            
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {TOUR_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? "w-6 bg-primary" 
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between pt-2">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
              <Button onClick={handleNext}>
                {currentStep === TOUR_STEPS.length - 1 ? "Get Started" : "Next"}
                {currentStep < TOUR_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};
