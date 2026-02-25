import * as React from "react"
import { Star, StarHalf, Calendar, User, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface WorkerReviewDisplayProps {
  review: {
    id: string
    rating: number
    comment: string | null
    would_rehire: boolean | null
    created_at: string
  }
  reviewer?: {
    business_name: string
    logo_url: string | null
    user?: {
      full_name: string
    } | null
  } | null
  showReviewerInfo?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeVariants = {
  sm: {
    star: "h-3 w-3",
    text: "text-xs",
    container: "p-4",
    avatar: "h-8 w-8",
    gap: "gap-2",
  },
  md: {
    star: "h-4 w-4",
    text: "text-sm",
    container: "p-6",
    avatar: "h-10 w-10",
    gap: "gap-3",
  },
  lg: {
    star: "h-5 w-5",
    text: "text-base",
    container: "p-6",
    avatar: "h-12 w-12",
    gap: "gap-4",
  },
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

function StarRating({
  rating,
  size,
}: {
  rating: number
  size: "sm" | "md" | "lg"
}) {
  const clampedRating = Math.max(1, Math.min(5, rating))
  const fullStars = Math.floor(clampedRating)
  const hasHalfStar = clampedRating - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  const getStarColor = (rating: number) => {
    if (rating >= 4.5) return "fill-green-500 text-green-500 dark:fill-green-400 dark:text-green-400"
    if (rating >= 3.5) return "fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400"
    if (rating >= 2.5) return "fill-orange-500 text-orange-500 dark:fill-orange-400 dark:text-orange-400"
    return "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400"
  }

  const starColor = getStarColor(clampedRating)

  return (
    <div className="flex items-center" aria-label={`Rating: ${clampedRating} out of 5 stars`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className={cn(sizeVariants[size].star, starColor)}
        />
      ))}
      {hasHalfStar && (
        <StarHalf
          className={cn(sizeVariants[size].star, starColor)}
        />
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className={cn(sizeVariants[size].star, "text-gray-300 dark:text-gray-600")}
        />
      ))}
    </div>
  )
}

export function WorkerReviewDisplay({
  review,
  reviewer,
  showReviewerInfo = true,
  size = "md",
  className,
}: WorkerReviewDisplayProps) {
  const { rating, comment, would_rehire, created_at } = review
  const styles = sizeVariants[size]

  return (
    <Card className={cn("transition-shadow hover:shadow-sm", className)}>
      <CardHeader className={cn(styles.container, "pb-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {showReviewerInfo && reviewer ? (
              <>
                <Avatar className={styles.avatar}>
                  <AvatarImage src={reviewer.logo_url || undefined} alt={reviewer.business_name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(reviewer.business_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold truncate", styles.text)}>
                    {reviewer.business_name}
                  </p>
                  <div className={cn("flex items-center text-muted-foreground", styles.text, styles.gap)}>
                    <Calendar className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
                    <span>{formatDate(created_at)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className={cn("flex items-center text-muted-foreground", styles.text, styles.gap)}>
                <Calendar className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
                <span>{formatDate(created_at)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <StarRating rating={rating} size={size} />
              <span className={cn("font-bold", styles.text)}>
                {rating.toFixed(1)}
              </span>
            </div>

            {would_rehire && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
                Would Rehire
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {comment && (
        <CardContent className={cn("pt-0", styles.container, "space-y-3")}>
          <p className={cn("text-muted-foreground", styles.text, "leading-relaxed")}>
            {comment}
          </p>
        </CardContent>
      )}
    </Card>
  )
}

export interface WorkerReviewListProps {
  reviews: Array<{
    id: string
    rating: number
    comment: string | null
    would_rehire: boolean | null
    created_at: string
  }>
  reviewers?: Map<string, {
    business_name: string
    logo_url: string | null
    user?: {
      full_name: string
    } | null
  }>
  showReviewerInfo?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  emptyMessage?: string
}

export function WorkerReviewList({
  reviews,
  reviewers,
  showReviewerInfo = true,
  size = "md",
  className,
  emptyMessage = "No reviews yet",
}: WorkerReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <Star className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {reviews.map((review) => (
        <WorkerReviewDisplay
          key={review.id}
          review={review}
          reviewer={reviewers?.get(review.id)}
          showReviewerInfo={showReviewerInfo}
          size={size}
        />
      ))}
    </div>
  )
}
