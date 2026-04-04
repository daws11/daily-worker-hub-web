"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  OnboardingDraft,
} from "@/lib/utils/draft-storage";
import { completeWorkerOnboarding } from "@/lib/actions/onboarding";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { StepNavigation } from "@/components/onboarding/step-navigation";
import { PersonalInfo } from "@/components/onboarding/worker-steps/personal-info";
import { LocationStep } from "@/components/onboarding/worker-steps/location";
import { SkillsReview } from "@/components/onboarding/worker-steps/skills-review";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const TOTAL_STEPS = 3;

export default function WorkerOnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Current step
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [personalInfo, setPersonalInfo] = useState<
    Pick<OnboardingDraft, "fullName" | "phone" | "dob">
  >({
    fullName: "",
    phone: "",
    dob: "",
  });
  const [locationInfo, setLocationInfo] = useState<
    Pick<OnboardingDraft, "address" | "lat" | "lng">
  >({
    address: "",
    lat: 0,
    lng: 0,
  });
  const [skillsInfo, setSkillsInfo] = useState<
    Pick<OnboardingDraft, "primaryCategory" | "experienceLevel" | "bio">
  >({
    primaryCategory: "",
    experienceLevel: undefined,
    bio: "",
  });

  // Form validation states
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(false);
  const [step3Valid, setStep3Valid] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [hasWorkerProfile, setHasWorkerProfile] = useState(false);

  // User's initial full name from metadata
  const [initialFullName, setInitialFullName] = useState<string>("");

  // Check if user is logged in and has existing worker profile
  useEffect(() => {
    async function checkUserProfile() {
      if (authLoading) return;

      if (!user) {
        router.push("/login");
        return;
      }

      // Get full name from user metadata
      const fullName = user.user_metadata?.full_name || "";
      setInitialFullName(fullName);

      // Check if worker profile already exists
      try {
        const { data: existingWorker, error } = await (supabase as any)
          .from("workers")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (existingWorker) {
          setHasWorkerProfile(true);
          // Redirect to worker dashboard
          router.push("/worker");
          return;
        }
      } catch (error) {
        // No worker profile exists, continue with onboarding
      }

      // Load draft if exists
      const draft = loadDraft();
      if (draft) {
        if (draft.fullName)
          setPersonalInfo((prev) => ({
            ...prev,
            fullName: draft.fullName || "",
          }));
        if (draft.phone)
          setPersonalInfo((prev) => ({ ...prev, phone: draft.phone || "" }));
        if (draft.dob)
          setPersonalInfo((prev) => ({ ...prev, dob: draft.dob || "" }));
        if (draft.address)
          setLocationInfo((prev) => ({
            ...prev,
            address: draft.address || "",
          }));
        if (draft.lat)
          setLocationInfo((prev) => ({ ...prev, lat: draft.lat || 0 }));
        if (draft.lng)
          setLocationInfo((prev) => ({ ...prev, lng: draft.lng || 0 }));
        if (draft.primaryCategory)
          setSkillsInfo((prev) => ({
            ...prev,
            primaryCategory: draft.primaryCategory || "",
          }));
        if (draft.experienceLevel)
          setSkillsInfo((prev) => ({
            ...prev,
            experienceLevel: draft.experienceLevel,
          }));
        if (draft.bio)
          setSkillsInfo((prev) => ({ ...prev, bio: draft.bio || "" }));
        if (draft.currentStep) setCurrentStep(draft.currentStep);
      }

      setIsCheckingProfile(false);
    }

    checkUserProfile();
  }, [user, authLoading, router]);

  // Save draft when step changes
  useEffect(() => {
    if (!isCheckingProfile && !hasWorkerProfile) {
      saveDraft({
        ...personalInfo,
        ...locationInfo,
        ...skillsInfo,
        currentStep,
      });
    }
  }, [
    personalInfo,
    locationInfo,
    skillsInfo,
    currentStep,
    isCheckingProfile,
    hasWorkerProfile,
  ]);

  // Check if current step is valid
  const isCurrentStepValid = useCallback(() => {
    switch (currentStep) {
      case 1:
        return step1Valid;
      case 2:
        return step2Valid;
      case 3:
        return step3Valid && termsAccepted;
      default:
        return false;
    }
  }, [currentStep, step1Valid, step2Valid, step3Valid, termsAccepted]);

  // Navigation handlers
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error("You must be logged in to complete onboarding");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    setIsLoading(true);

    try {
      const result = await completeWorkerOnboarding({
        userId: user.id,
        fullName: personalInfo.fullName || "",
        phone: personalInfo.phone || "",
        dob: personalInfo.dob || "",
        address: locationInfo.address || "",
        lat: locationInfo.lat || 0,
        lng: locationInfo.lng || 0,
        primaryCategory: skillsInfo.primaryCategory || "",
        experienceLevel: skillsInfo.experienceLevel || "Beginner",
        bio: skillsInfo.bio || undefined,
      });

      if (result.success) {
        // Clear draft
        clearDraft();

        toast.success("Profile created successfully!");

        // Redirect to worker dashboard
        router.push("/worker");
      } else {
        toast.error(result.error || "Failed to create profile");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking profile
  if (authLoading || isCheckingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking your profile...</p>
        </div>
      </div>
    );
  }

  // If user has worker profile, don't render (will redirect)
  if (hasWorkerProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Tell us about yourself to start finding jobs
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {currentStep === 1 && "Personal Information"}
              {currentStep === 2 && "Your Location"}
              {currentStep === 3 && "Skills & Review"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 &&
                "Let's start with some basic information about you"}
              {currentStep === 2 &&
                "Help businesses find you by setting your location"}
              {currentStep === 3 &&
                "Tell us about your skills and review your profile"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <PersonalInfo
                value={personalInfo}
                onChange={setPersonalInfo}
                onValidChange={setStep1Valid}
                initialFullName={initialFullName}
              />
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <LocationStep
                value={locationInfo}
                onChange={setLocationInfo}
                onValidChange={setStep2Valid}
              />
            )}

            {/* Step 3: Skills & Review */}
            {currentStep === 3 && (
              <SkillsReview
                value={skillsInfo}
                personalInfo={personalInfo}
                locationInfo={locationInfo}
                onChange={setSkillsInfo}
                onValidChange={setStep3Valid}
                onTermsChange={setTermsAccepted}
              />
            )}

            {/* Navigation */}
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              onBack={handleBack}
              onNext={handleNext}
              isLoading={isLoading}
              isFormValid={isCurrentStepValid()}
              isLastStep={currentStep === TOTAL_STEPS}
            />
          </CardContent>
        </Card>

        {/* Save indicator */}
        <p className="text-xs text-center text-muted-foreground">
          Your progress is automatically saved
        </p>
      </div>
    </div>
  );
}
