// localStorage helpers for saving/loading onboarding draft
// Key: 'onboarding_draft'

export interface OnboardingDraft {
  // Step 1: Personal Info (Worker)
  fullName?: string;
  phone?: string;
  dob?: string;

  // Step 2: Location (Worker)
  address?: string;
  lat?: number;
  lng?: number;

  // Step 3: Skills & Review (Worker)
  primaryCategory?: string;
  experienceLevel?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  bio?: string;

  // Business Onboarding Fields
  businessName?: string;
  businessType?:
    | "Hotel/Villa"
    | "Restaurant"
    | "Event Venue"
    | "Spa/Wellness"
    | "Other";
  businessPhone?: string;
  businessEmail?: string;
  website?: string;
  businessAddress?: string;
  businessLat?: number;
  businessLng?: number;
  description?: string;

  // Metadata
  currentStep?: number;
  savedAt?: string;
  isBusiness?: boolean;
}

const DRAFT_KEY = "onboarding_draft";

export function saveDraft(draft: Partial<OnboardingDraft>): void {
  if (typeof window === "undefined") return;

  const existingDraft = loadDraft();
  const updatedDraft: OnboardingDraft = {
    ...existingDraft,
    ...draft,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(updatedDraft));
  } catch (error) {
    console.error("Failed to save onboarding draft:", error);
  }
}

export function loadDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const draftJson = localStorage.getItem(DRAFT_KEY);
    if (!draftJson) return null;

    return JSON.parse(draftJson) as OnboardingDraft;
  } catch (error) {
    console.error("Failed to load onboarding draft:", error);
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error("Failed to clear onboarding draft:", error);
  }
}
