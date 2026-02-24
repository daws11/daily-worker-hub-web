"use client"

import * as React from "react"
import { Calendar, Phone, User, Check, X, MoreVertical } from "lucide-react"

import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar"
import { cn } from "@/lib/utils"
import type { ApplicantWithDetails } from "@/lib/data/jobs"
import { useTranslation } from "@/lib/i18n/hooks"

export interface ApplicantListProps extends React.HTMLAttributes<HTMLDivElement> {
  applicants: ApplicantWithDetails[]
  onAccept?: (applicantId: string) => void
  onReject?: (applicantId: string) => void
  isLoading?: boolean
}

const ApplicantList = React.forwardRef<HTMLDivElement, ApplicantListProps>(
  ({ applicants, onAccept, onReject, isLoading = false, className, ...props }, ref) => {
    const { t, locale } = useTranslation()

    // Locale mapping for date formatting
    const localeMap: Record<string, string> = {
      id: "id-ID",
      en: "en-US"
    }

    // Format date based on current locale
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString(localeMap[locale] || locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    // Get status badge variant
    const getStatusVariant = (
      status: ApplicantWithDetails["status"]
    ): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
        case "pending":
          return "outline"
        case "accepted":
          return "default"
        case "rejected":
          return "destructive"
        case "in_progress":
          return "secondary"
        case "completed":
          return "default"
        case "cancelled":
          return "destructive"
        default:
          return "outline"
      }
    }

    // Get status label using translation
    const getStatusLabel = (status: ApplicantWithDetails["status"]): string => {
      switch (status) {
        case "pending":
          return t('common.pending')
        case "accepted":
          return t('common.accepted')
        case "rejected":
          return t('common.rejected')
        case "in_progress":
          return t('common.inProgress')
        case "completed":
          return t('common.completed')
        case "cancelled":
          return t('common.cancelled')
        default:
          return status
      }
    }

    // Get initials from name
    const getInitials = (name: string) => {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }

    // Check if application can be accepted
    const canAccept = (applicant: ApplicantWithDetails) => {
      return applicant.status === "pending" && onAccept
    }

    // Check if application can be rejected
    const canReject = (applicant: ApplicantWithDetails) => {
      return (applicant.status === "pending" || applicant.status === "accepted") && onReject
    }

    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>{t('business.applicantList')}</CardTitle>
            <CardDescription>{t('business.loadingApplicants')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (!applicants || applicants.length === 0) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>{t('business.applicantList')}</CardTitle>
            <CardDescription>
              {t('business.noApplicants')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t('business.noApplicantsMessage')}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <CardTitle>{t('business.applicantList')}</CardTitle>
          <CardDescription>
            {t('business.applicants')} ({t('business.applicantCount', { count: applicants.length })})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('business.applicantsHeader')}</TableHead>
                  <TableHead>{t('business.phoneHeader')}</TableHead>
                  <TableHead>{t('business.applicationDateHeader')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('business.actionHeader')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicants.map((applicant) => (
                  <TableRow key={applicant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {applicant.workers.avatar_url ? (
                            <AvatarImage
                              src={applicant.workers.avatar_url}
                              alt={applicant.workers.full_name}
                            />
                          ) : null}
                          <AvatarFallback>
                            {getInitials(applicant.workers.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="font-medium">{applicant.workers.full_name}</div>
                          {applicant.workers.bio && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {applicant.workers.bio}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{applicant.workers.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(applicant.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(applicant.status)}>
                        {getStatusLabel(applicant.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canAccept(applicant) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAccept?.(applicant.id)}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                            <span className="sr-only">{t('business.acceptApplicant')}</span>
                          </Button>
                        )}
                        {canReject(applicant) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReject?.(applicant.id)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">{t('business.rejectApplicant')}</span>
                          </Button>
                        )}
                        {!canAccept(applicant) && !canReject(applicant) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">{t('business.noAction')}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }
)
ApplicantList.displayName = "ApplicantList"

// Helper component for the empty state icon
function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export { ApplicantList }
