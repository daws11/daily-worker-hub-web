"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/providers/auth-provider"
import { supabase } from "@/lib/supabase/client"
import { saveDraft, loadDraft, clearDraft, OnboardingDraft } from "@/lib/utils/draft-storage"
import { completeBusinessOnboarding } from "@/lib/actions/onboarding"
import { ProgressBar } from "@/components/onboarding/progress-bar"
import { StepNavigation } from "@/components/onboarding/step-navigation"
import { BusinessIdentity } from "@/components/onboarding/business-steps/identity"
import { BusinessLocation } from "@/components/onboarding/business-steps/location"
import { BusinessDescriptionReview } from "@/components/onboarding/business-steps/description-review"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const TOTAL_STEPS = 3

// Custom progress bar labels for business
const BUSINESS_STEP_LABELS = ["Identity", "Location", "Review"]

function BusinessProgressBar({ currentStep, totalSteps = 3 }: { currentStep: number; totalSteps?: number }) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="w-full space-y-3">
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Step labels */}
      <div className="flex justify-between text-sm">
        {BUSINESS_STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          
          return (
            <div 
              key={label}
              className={`flex flex-col items-center ${
                isActive ? "text-primary font-medium" : 
                isCompleted ? "text-muted-foreground" : 
                "text-muted-foreground/50"
              }`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" :
                  isCompleted ? "bg-primary/20 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span className="text-xs hidden sm:block">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BusinessOnboardingPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  
  // Current step
  const [currentStep, setCurrentStep] = useState(1)
  
  // Form data
  const [identityInfo, setIdentityInfo] = useState<Pick<OnboardingDraft, 'businessName' | 'businessType' | 'businessPhone' | 'businessEmail'>>({
    businessName: "",
    businessType: undefined,
    businessPhone: "",
    businessEmail: ""
  })
  const [locationInfo, setLocationInfo] = useState<Pick<OnboardingDraft, 'businessAddress' | 'businessLat' | 'businessLng'>>({
    businessAddress: "",
    businessLat: 0,
    businessLng: 0
  })
  const [additionalInfo, setAdditionalInfo] = useState<Pick<OnboardingDraft, 'description' | 'website'>>({
    description: "",
    website: ""
  })
  
  // Form validation states
  const [step1Valid, setStep1Valid] = useState(false)
  const [step2Valid, setStep2Valid] = useState(false)
  const [step3Valid, setStep3Valid] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false)
  
  // User's initial email from auth
  const [initialEmail, setInitialEmail] = useState<string>("")

  // Check if user is logged in and has existing business profile
  useEffect(() => {
    async function checkUserProfile() {
      if (authLoading) return
      
      if (!user) {
        router.push("/login")
        return
      }

      // Get email from user
      const email = user.email || ""
      setInitialEmail(email)

      // Check if business profile already exists
      try {
        const { data: existingBusiness, error } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (existingBusiness) {
          setHasBusinessProfile(true)
          // Redirect to business dashboard
          router.push("/business/jobs")
          return
        }
      } catch (error) {
        // No business profile exists, continue with onboarding
      }
      
      // Load draft if exists
      const draft = loadDraft()
      if (draft && draft.isBusiness) {
        if (draft.businessName) setIdentityInfo(prev => ({ ...prev, businessName: draft.businessName || "" }))
        if (draft.businessType) setIdentityInfo(prev => ({ ...prev, businessType: draft.businessType }))
        if (draft.businessPhone) setIdentityInfo(prev => ({ ...prev, businessPhone: draft.businessPhone || "" }))
        if (draft.businessEmail) setIdentityInfo(prev => ({ ...prev, businessEmail: draft.businessEmail || "" }))
        if (draft.businessAddress) setLocationInfo(prev => ({ ...prev, businessAddress: draft.businessAddress || "" }))
        if (draft.businessLat) setLocationInfo(prev => ({ ...prev, businessLat: draft.businessLat || 0 }))
        if (draft.businessLng) setLocationInfo(prev => ({ ...prev, businessLng: draft.businessLng || 0 }))
        if (draft.description) setAdditionalInfo(prev => ({ ...prev, description: draft.description || "" }))
        if (draft.website) setAdditionalInfo(prev => ({ ...prev, website: draft.website || "" }))
        if (draft.currentStep) setCurrentStep(draft.currentStep)
      } else {
        // Pre-fill email
        setIdentityInfo(prev => ({ ...prev, businessEmail: email }))
      }
      
      setIsCheckingProfile(false)
    }

    checkUserProfile()
  }, [user, authLoading, router])

  // Save draft when step changes
  useEffect(() => {
    if (!isCheckingProfile && !hasBusinessProfile) {
      saveDraft({
        ...identityInfo,
        businessAddress: locationInfo.businessAddress,
        businessLat: locationInfo.businessLat,
        businessLng: locationInfo.businessLng,
        ...additionalInfo,
        currentStep,
        isBusiness: true
      })
    }
  }, [identityInfo, locationInfo, additionalInfo, currentStep, isCheckingProfile, hasBusinessProfile])

  // Check if current step is valid
  const isCurrentStepValid = useCallback(() => {
    switch (currentStep) {
      case 1:
        return step1Valid
      case 2:
        return step2Valid
      case 3:
        return step3Valid && termsAccepted
      default:
        return false
    }
  }, [currentStep, step1Valid, step2Valid, step3Valid, termsAccepted])

  // Navigation handlers
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete onboarding
      await handleComplete()
    }
  }

  const handleComplete = async () => {
    if (!user) {
      toast.error("You must be logged in to complete onboarding")
      return
    }

    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions")
      return
    }

    setIsLoading(true)

    try {
      const result = await completeBusinessOnboarding({
        userId: user.id,
        name: identityInfo.businessName || "",
        phone: identityInfo.businessPhone || "",
        email: identityInfo.businessEmail || "",
        website: additionalInfo.website || undefined,
        address: locationInfo.businessAddress || "",
        lat: locationInfo.businessLat || 0,
        lng: locationInfo.businessLng || 0,
        description: additionalInfo.description || undefined,
        businessType: identityInfo.businessType || "Other"
      })

      if (result.success) {
        // Clear draft
        clearDraft()
        
        toast.success("Business profile created successfully!")
        
        // Redirect to business dashboard
        router.push("/business/jobs")
      } else {
        toast.error(result.error || "Failed to create business profile")
      }
    } catch (error) {
      console.error("Onboarding error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking profile
  if (authLoading || isCheckingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking your profile...</p>
        </div>
      </div>
    )
  }

  // If user has business profile, don't render (will redirect)
  if (hasBusinessProfile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Complete Your Business Profile</h1>
          <p className="text-muted-foreground">
            Tell us about your business to start finding workers
          </p>
        </div>

        {/* Progress Bar */}
        <BusinessProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {currentStep === 1 && "Business Identity"}
              {currentStep === 2 && "Business Location"}
              {currentStep === 3 && "Description & Review"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Let's start with some basic information about your business"}
              {currentStep === 2 && "Help workers find your business by setting your location"}
              {currentStep === 3 && "Add a description and review your profile"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Business Identity */}
            {currentStep === 1 && (
              <BusinessIdentity
                value={identityInfo}
                onChange={setIdentityInfo}
                onValidChange={setStep1Valid}
                initialEmail={initialEmail}
              />
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <BusinessLocation
                value={locationInfo}
                onChange={setLocationInfo}
                onValidChange={setStep2Valid}
              />
            )}

            {/* Step 3: Description & Review */}
            {currentStep === 3 && (
              <BusinessDescriptionReview
                value={additionalInfo}
                identityInfo={identityInfo}
                locationInfo={locationInfo}
                onChange={setAdditionalInfo}
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
  )
}
