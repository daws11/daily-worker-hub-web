"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Star,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface PreviousReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface BookingCompletionReviewProps {
  bookingId: string;
  workerId: string;
  businessId: string;
  businessName?: string;
  jobTitle?: string;
  onSubmit?: (data: { rating: number; comment?: string }) => Promise<void>;
  previousReview?: PreviousReview | null;
  className?: string;
}

// ============================================================================
// STAR RATING INPUT
// ============================================================================

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

function StarRatingInput({
  value,
  onChange,
  disabled,
  size = "md",
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = React.useState(0);

  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverValue || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className={cn(
              "transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded",
              disabled && "cursor-not-allowed opacity-50",
            )}
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 hover:text-yellow-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// STAR RATING DISPLAY
// ============================================================================

interface StarRatingDisplayProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

function StarRatingDisplay({
  rating,
  size = "md",
  showValue = true,
}: StarRatingDisplayProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClasses[size],
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300",
          )}
        />
      ))}
      {showValue && (
        <span className="ml-2 font-medium text-sm">{rating}/5</span>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BookingCompletionReview({
  bookingId,
  workerId,
  businessId,
  businessName,
  jobTitle,
  onSubmit,
  previousReview,
  className,
}: BookingCompletionReviewProps) {
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasSubmitted, setHasSubmitted] = React.useState(!!previousReview);

  // If there's a previous review, show it
  React.useEffect(() => {
    if (previousReview) {
      setRating(previousReview.rating);
      setComment(previousReview.comment || "");
      setHasSubmitted(true);
    }
  }, [previousReview]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Pilih rating terlebih dahulu");
      return;
    }

    if (!onSubmit) {
      toast.error("Handler tidak tersedia");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        comment: comment.trim() || undefined,
      });
      setHasSubmitted(true);
      toast.success("Ulasan berhasil dikirim!");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim ulasan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show submitted review
  if (hasSubmitted || previousReview) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Ulasan Diberikan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <StarRatingDisplay
              rating={previousReview?.rating || rating}
              size="md"
            />
          </div>

          {(previousReview?.comment || comment) && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {previousReview?.comment || comment}
              </p>
            </div>
          )}

          {previousReview?.created_at && (
            <p className="text-xs text-muted-foreground">
              Diberikan pada{" "}
              {new Date(previousReview.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Beri Ulasan
        </CardTitle>
        {businessName && (
          <p className="text-sm text-muted-foreground">
            Untuk {businessName}
            {jobTitle && ` - ${jobTitle}`}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rating Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Rating *</label>
          <StarRatingInput
            value={rating}
            onChange={setRating}
            disabled={isSubmitting}
            size="lg"
          />
          {rating > 0 && (
            <p className="text-xs text-muted-foreground">
              {rating === 5 && "Sangat Baik"}
              {rating === 4 && "Baik"}
              {rating === 3 && "Cukup"}
              {rating === 2 && "Kurang"}
              {rating === 1 && "Sangat Kurang"}
            </p>
          )}
        </div>

        {/* Comment Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Komentar (Opsional)
          </label>
          <Textarea
            placeholder="Ceritakan pengalaman Anda bekerja dengan bisnis ini..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/1000
          </p>
        </div>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Mengirim...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Kirim Ulasan
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// COMPACT VERSION
// ============================================================================

export function BookingCompletionReviewCompact({
  bookingId,
  workerId,
  businessId,
  onSubmit,
  previousReview,
}: Omit<
  BookingCompletionReviewProps,
  "businessName" | "jobTitle" | "className"
>) {
  const [showDialog, setShowDialog] = React.useState(false);
  const [rating, setRating] = React.useState(previousReview?.rating || 0);
  const [comment, setComment] = React.useState(previousReview?.comment || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (previousReview) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        {previousReview.rating}/5
      </Badge>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Pilih rating terlebih dahulu");
      return;
    }

    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        comment: comment.trim() || undefined,
      });
      setShowDialog(false);
      toast.success("Ulasan berhasil dikirim!");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim ulasan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
        <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
        Beri Ulasan
      </Button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Beri Ulasan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating *</label>
                <StarRatingInput
                  value={rating}
                  onChange={setRating}
                  disabled={isSubmitting}
                  size="lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Komentar (Opsional)
                </label>
                <Textarea
                  placeholder="Ceritakan pengalaman Anda..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Kirim
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}

// ============================================================================
// STAR RATING INPUT EXPORT
// ============================================================================

export { StarRatingInput, StarRatingDisplay };
