"use client"

import React from 'react'
import { JobCard } from './JobCard'
import { JobWithRelations } from '@/lib/types/job'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Briefcase, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/hooks'

interface JobListProps {
  jobs: JobWithRelations[]
  loading?: boolean
  onJobClick?: (job: JobWithRelations) => void
  className?: string
  emptyTitle?: string
  emptyDescription?: string
}

export function JobList({
  jobs,
  loading = false,
  onJobClick,
  className,
  emptyTitle,
  emptyDescription
}: JobListProps) {
  const { t } = useTranslation()

  const emptyTitleText = emptyTitle || t('jobs.noJobsMatchCriteria')
  const emptyDescriptionText = emptyDescription || t('jobs.tryAdjustingFilters')
  // Show loading state
  if (loading) {
    return (
      <div className={cn('space-y-3 sm:space-y-4', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-5 sm:h-6 w-32 sm:w-48 bg-muted rounded" />
                  <div className="h-4 sm:h-5 w-16 sm:w-20 bg-muted rounded" />
                </div>
                <div className="h-3 sm:h-4 w-48 sm:w-64 bg-muted rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 sm:h-6 w-20 sm:w-24 bg-muted rounded-full" />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="h-3 sm:h-4 w-24 sm:w-32 bg-muted rounded" />
                <div className="h-3 sm:h-4 w-full bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Show empty state
  if (jobs.length === 0) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
          <div className="rounded-full bg-muted p-3 sm:p-4 mb-3 sm:mb-4">
            <SearchX className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-2">{emptyTitleText}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">{emptyDescriptionText}</p>
        </CardContent>
      </Card>
    )
  }

  // Show job list - single column for mobile-first, job cards stack vertically
  return (
    <div className={cn('grid gap-3 sm:gap-4 grid-cols-1', className)}>
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onClick={onJobClick ? () => onJobClick(job) : undefined}
        />
      ))}
    </div>
  )
}

interface JobListWithHeaderProps {
  jobs: JobWithRelations[]
  loading?: boolean
  onJobClick?: (job: JobWithRelations) => void
  className?: string
  title?: string
  subtitle?: string
  emptyTitle?: string
  emptyDescription?: string
}

export function JobListWithHeader({
  jobs,
  loading = false,
  onJobClick,
  className,
  title,
  subtitle,
  emptyTitle,
  emptyDescription
}: JobListWithHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <div className="flex items-center gap-2 flex-wrap">
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
              {!loading && jobs.length > 0 && (
                <span className="text-xs sm:text-sm text-muted-foreground">
                  ({jobs.length} {jobs.length === 1 ? t('jobs.title') : t('navigation.myBookings')})
                </span>
              )}
            </div>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      <JobList
        jobs={jobs}
        loading={loading}
        onJobClick={onJobClick}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  )
}
