import * as React from "react"
import { Calendar, MapPin, Building2, Briefcase, Wallet } from "lucide-react"

import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card"
import { cn } from "@/lib/utils"
import type { JobWithDetails } from "@/lib/data/jobs"

export interface JobCardProps extends React.HTMLAttributes<HTMLDivElement> {
  job: JobWithDetails
  onApply?: (jobId: string) => void
  isApplied?: boolean
  showApplyButton?: boolean
}

const JobCard = React.forwardRef<HTMLDivElement, JobCardProps>(
  (
    {
      job,
      onApply,
      isApplied = false,
      showApplyButton = true,
      className,
      ...props
    },
    ref
  ) => {
    const {
      id,
      title,
      description,
      budget_min,
      budget_max,
      status,
      deadline,
      address,
      businesses,
      categories,
      jobs_skills,
    } = job

    // Format deadline date (Indonesian locale)
    const formattedDeadline = new Date(deadline).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })

    // Format budget to Indonesian Rupiah
    const formatBudget = (amount: number) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }

    // Get status badge variant
    const getStatusVariant = (
      jobStatus: typeof status
    ): "default" | "secondary" | "destructive" | "outline" => {
      switch (jobStatus) {
        case "open":
          return "default"
        case "in_progress":
          return "secondary"
        case "completed":
          return "outline"
        case "cancelled":
          return "destructive"
        default:
          return "outline"
      }
    }

    // Get status label in Indonesian
    const getStatusLabel = (jobStatus: typeof status): string => {
      switch (jobStatus) {
        case "open":
          return "Buka"
        case "in_progress":
          return "Sedang Berjalan"
        case "completed":
          return "Selesai"
        case "cancelled":
          return "Dibatalkan"
        default:
          return jobStatus
      }
    }

    // Truncate description if too long
    const truncateDescription = (text: string, maxLength: number = 120) => {
      if (text.length <= maxLength) return text
      return text.slice(0, maxLength) + "..."
    }

    const isJobOpen = status === "open"

    return (
      <Card
        ref={ref}
        className={cn("flex flex-col", className)}
        {...props}
      >
        <CardHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <CardTitle className="line-clamp-1 text-lg">{title}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs">
                <Building2 className="h-3 w-3" />
                <span className="line-clamp-1">{businesses.name}</span>
                {businesses.is_verified && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Terverifikasi
                  </Badge>
                )}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(status)} className="flex-shrink-0">
              {getStatusLabel(status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {truncateDescription(description)}
          </p>

          {/* Category */}
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{categories.name}</span>
          </div>

          {/* Skills */}
          {jobs_skills && jobs_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {jobs_skills.slice(0, 3).map((item) => (
                <Badge
                  key={item.skills.id}
                  variant="outline"
                  className="text-xs"
                >
                  {item.skills.name}
                </Badge>
              ))}
              {jobs_skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{jobs_skills.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Job Details */}
          <div className="space-y-2 pt-2">
            {/* Budget */}
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {formatBudget(budget_min)}
                {budget_max > budget_min && ` - ${formatBudget(budget_max)}`}
              </span>
            </div>

            {/* Deadline */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Deadline: {formattedDeadline}</span>
            </div>

            {/* Location */}
            {address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-1">{address}</span>
              </div>
            )}
          </div>
        </CardContent>

        {showApplyButton && (
          <CardFooter className="flex-shrink-0 border-t pt-4">
            <Button
              onClick={() => onApply?.(id)}
              disabled={!isJobOpen || isApplied}
              className="w-full"
              variant={isApplied ? "secondary" : "default"}
            >
              {isApplied
                ? "Sudah Melamar"
                : isJobOpen
                  ? "Lamar Sekarang"
                  : "Pekerjaan Ditutup"}
            </Button>
          </CardFooter>
        )}
      </Card>
    )
  }
)
JobCard.displayName = "JobCard"

export { JobCard }
