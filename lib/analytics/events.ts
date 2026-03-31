/**
 * Typed custom event tracking functions for Vercel Analytics.
 *
 * All functions are client-side only and respect the user's Do Not Track preference.
 * Event payloads never include PII (email, phone, name, address).
 *
 * @see https://vercel.com/docs/concepts/analytics
 */

import { track as analyticsTrack } from "@vercel/analytics";

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export type TrackResult = {
  success: boolean;
  error?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Guard: only fire analytics in browser context when DNT is not enabled.
 * Returns false and sets an error message if tracking should be skipped.
 */
function canTrack(): { allowed: boolean; error?: string } {
  if (typeof window === "undefined") {
    return { allowed: false, error: "Cannot track in server context" };
  }
  if (
    navigator.doNotTrack === "1" ||
    (window as Window & { doNotTrack?: string }).doNotTrack === "1"
  ) {
    return { allowed: false, error: "User has Do Not Track enabled" };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export type RegistrationRole = "worker" | "business";

export type TrackRegistrationResult = TrackResult;

/**
 * Fire a `registration` event on user registration completion.
 * Call this after a successful registration flow (after the account is created).
 */
export function trackRegistration(
  role: RegistrationRole,
): TrackRegistrationResult {
  const { allowed, error } = canTrack();
  if (!allowed) return { success: false, error };

  try {
    analyticsTrack("registration", { role });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to track registration",
    };
  }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export type LoginMethod = "email" | "phone" | "google";

export type TrackLoginResult = TrackResult;

/**
 * Fire a `login` event on user authentication completion.
 * Call this after a successful login flow (after session is established).
 */
export function trackLogin(method: LoginMethod): TrackLoginResult {
  const { allowed, error } = canTrack();
  if (!allowed) return { success: false, error };

  try {
    analyticsTrack("login", { method });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to track login",
    };
  }
}

// ---------------------------------------------------------------------------
// Booking Created
// ---------------------------------------------------------------------------

export type TrackBookingCreatedResult = TrackResult;

/**
 * Fire a `booking_created` event when a new booking is created.
 * Call this immediately after the booking record is persisted.
 */
export function trackBookingCreated(params: {
  bookingId: string;
  amount: number;
}): TrackBookingCreatedResult {
  const { allowed, error } = canTrack();
  if (!allowed) return { success: false, error };

  try {
    analyticsTrack("booking_created", {
      booking_id: params.bookingId,
      amount: params.amount,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to track booking_created",
    };
  }
}

// ---------------------------------------------------------------------------
// Payment Success
// ---------------------------------------------------------------------------

export type TrackPaymentSuccessResult = TrackResult;

/**
 * Fire a `payment_success` event when a payment is confirmed.
 * Call this after the payment webhook / confirmation is received.
 */
export function trackPaymentSuccess(params: {
  bookingId: string;
  amount: number;
  method: string;
}): TrackPaymentSuccessResult {
  const { allowed, error } = canTrack();
  if (!allowed) return { success: false, error };

  try {
    analyticsTrack("payment_success", {
      booking_id: params.bookingId,
      amount: params.amount,
      payment_method: params.method,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to track payment_success",
    };
  }
}

// ---------------------------------------------------------------------------
// Job Application
// ---------------------------------------------------------------------------

export type TrackJobApplicationResult = TrackResult;

/**
 * Fire a `job_application` event when a worker submits a job application.
 * Call this after the application is successfully submitted.
 */
export function trackJobApplication(params: {
  workerId: string;
  jobId: string;
}): TrackJobApplicationResult {
  const { allowed, error } = canTrack();
  if (!allowed) return { success: false, error };

  try {
    analyticsTrack("job_application", {
      worker_id: params.workerId,
      job_id: params.jobId,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to track job_application",
    };
  }
}

// ---------------------------------------------------------------------------
// Review Submitted
// ---------------------------------------------------------------------------

export type TrackReviewSubmittedResult = TrackResult;

/**
 * Fire a `review_submitted` event when a user submits a review.
 * Call this after the review is persisted.
 */
export function trackReviewSubmitted(params: {
  bookingId: string;
  rating: number;
}): TrackReviewSubmittedResult {
  const { allowed, error } = canTrack();
  if (!allowed) return { success: false, error };

  try {
    analyticsTrack("review_submitted", {
      booking_id: params.bookingId,
      rating: params.rating,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to track review_submitted",
    };
  }
}
