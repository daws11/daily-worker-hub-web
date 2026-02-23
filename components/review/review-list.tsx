"use client"

import * as React from "react"
import { toast } from "sonner"
import { Star, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WorkerReviewList, WorkerReviewDisplay } from "@/components/review/worker-review-display"
import { BusinessReviewList, BusinessReviewDisplay } from "@/components/review/business-review-display"
import {
  getReviewsForWorker,
  getReviewsForBusiness,
  getWorkerAverageRating,
  getBusinessAverageRating,
  getWorkerRatingBreakdown,
  getWorkerRehireRate,
} from "@/lib/supabase/queries/reviews"

export interface ReviewListProps {
  /** ID of the entity (worker or business) to fetch reviews for */
  entityId: string
  /** Type of entity - whether fetching reviews for a worker or business */
  entityType: "worker" | "business"
  /** Number of reviews per page */
  perPage?: number
  /** Additional class name for the container */
  className?: string
}

interface RatingSummary {
  averageRating: number | null
  totalReviews: number
}

interface RatingBreakdownItem {
  rating: number
  count: number
  percentage: number
}

const REVIEWS_PER_PAGE = 10

function formatRating(rating: number | null): string {
  if (rating === null) return "0.0"
  return rating.toFixed(1)
}

function getRatingColor(rating: number | null): string {
  if (rating === null) return "text-muted-foreground"
  if (rating >= 4.5) return "text-green-600 dark:text-green-400"
  if (rating >= 3.5) return "text-yellow-600 dark:text-yellow-400"
  if (rating >= 2.5) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

export function ReviewList({ entityId, entityType, perPage = REVIEWS_PER_PAGE, className }: ReviewListProps) {
  const [reviews, setReviews] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [currentPage, setCurrentPage] = React.useState(1)

  // Summary stats
  const [ratingSummary, setRatingSummary] = React.useState<RatingSummary>({
    averageRating: null,
    totalReviews: 0,
  })

  // For workers: rating breakdown and rehire rate
  const [ratingBreakdown, setRatingBreakdown] = React.useState<RatingBreakdownItem[]>([])
  const [rehireRate, setRehireRate] = React.useState<number | null>(null)

  const totalPages = Math.ceil(ratingSummary.totalReviews / perPage)
  const paginatedReviews = reviews.slice((currentPage - 1) * perPage, currentPage * perPage)

  const loadReviews = React.useCallback(async () => {
    setIsLoading(true)
    try {
      if (entityType === "worker") {
        // Fetch reviews for worker (from businesses)
        const [reviewsResult, ratingResult, breakdownResult, rehireResult] = await Promise.all([
          getReviewsForWorker(entityId),
          getWorkerAverageRating(entityId),
          getWorkerRatingBreakdown(entityId),
          getWorkerRehireRate(entityId),
        ])

        if (reviewsResult.error) {
          throw reviewsResult.error
        }

        if (ratingResult.error) {
          throw ratingResult.error
        }

        setReviews(reviewsResult.data || [])

        if (ratingResult.data) {
          setRatingSummary({
            averageRating: ratingResult.data.average,
            totalReviews: ratingResult.data.count,
          })
        }

        if (breakdownResult.data?.breakdown) {
          const breakdown: RatingBreakdownItem[] = [
            { rating: 5, count: breakdownResult.data.breakdown[5] || 0, percentage: breakdownResult.data.percentages[5] || 0 },
            { rating: 4, count: breakdownResult.data.breakdown[4] || 0, percentage: breakdownResult.data.percentages[4] || 0 },
            { rating: 3, count: breakdownResult.data.breakdown[3] || 0, percentage: breakdownResult.data.percentages[3] || 0 },
            { rating: 2, count: breakdownResult.data.breakdown[2] || 0, percentage: breakdownResult.data.percentages[2] || 0 },
            { rating: 1, count: breakdownResult.data.breakdown[1] || 0, percentage: breakdownResult.data.percentages[1] || 0 },
          ]
          setRatingBreakdown(breakdown)
        }

        if (rehireResult.data?.rehireRate !== null) {
          setRehireRate(rehireResult.data.rehireRate)
        }

      } else {
        // Fetch reviews for business (from workers)
        const [reviewsResult, ratingResult] = await Promise.all([
          getReviewsForBusiness(entityId),
          getBusinessAverageRating(entityId),
        ])

        if (reviewsResult.error) {
          throw reviewsResult.error
        }

        if (ratingResult.error) {
          throw ratingResult.error
        }

        setReviews(reviewsResult.data || [])

        if (ratingResult.data) {
          setRatingSummary({
            averageRating: ratingResult.data.average,
            totalReviews: ratingResult.data.count,
          })
        }
      }
    } catch (error: any) {
      toast.error("Gagal memuat ulasan: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }, [entityId, entityType])

  React.useEffect(() => {
    loadReviews()
  }, [loadReviews])

  // Reset to page 1 when reviews change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [ratingSummary.totalReviews])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Rating Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400" />
            Rating Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={cn("text-4xl font-bold", getRatingColor(ratingSummary.averageRating))}>
                {formatRating(ratingSummary.averageRating)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                out of 5
              </p>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium">
                  {ratingSummary.totalReviews} {ratingSummary.totalReviews === 1 ? "review" : "reviews"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entityType === "worker" ? "from businesses" : "from workers"}
                </p>
              </div>

              {entityType === "worker" && rehireRate !== null && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm">
                    <span className="font-semibold">{rehireRate}%</span>{" "}
                    <span className="text-muted-foreground">would rehire</span>
                  </p>
                </div>
              )}
            </div>

            {/* Rating Breakdown (for workers) */}
            {entityType === "worker" && ratingBreakdown.length > 0 && (
              <div className="flex-1 space-y-2">
                {ratingBreakdown.map((item) => (
                  <div key={item.rating} className="flex items-center gap-2 text-sm">
                    <span className="w-12 text-muted-foreground">{item.rating} star</span>
                    <div className="flex-1 h-2 bg-primary/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {paginatedReviews.length > 0 ? (
        <>
          {entityType === "worker" ? (
            <WorkerReviewList
              reviews={paginatedReviews.map((review) => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                would_rehire: review.would_rehire,
                created_at: review.created_at,
              }))}
              reviewers={new Map(
                paginatedReviews.map((review) => [
                  review.id,
                  {
                    business_name: review.business?.name || "Unknown Business",
                    logo_url: null,
                  },
                ])
              )}
              showReviewerInfo
              size="md"
            />
          ) : (
            <BusinessReviewList
              reviews={paginatedReviews.map((review) => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                created_at: review.created_at,
              }))}
              reviewers={new Map(
                paginatedReviews.map((review) => [
                  review.id,
                  {
                    full_name: review.worker?.full_name || "Unknown Worker",
                    avatar_url: review.worker?.avatar_url || null,
                  },
                ])
              )}
              showReviewerInfo
              size="md"
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first, last, current, and adjacent pages
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)

                  if (!showPage) {
                    if (
                      (page === 2 && currentPage > 4) ||
                      (page === totalPages - 1 && currentPage < totalPages - 3)
                    ) {
                      return (
                        <span key={page} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      )
                    }
                    return null
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="min-w-[2.5rem]"
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No reviews yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
