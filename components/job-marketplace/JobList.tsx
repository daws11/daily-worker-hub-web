"use client"

import React from 'react'
import { JobCard } from './JobCard'
import { JobWithRelations } from '@/lib/types/job'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Briefcase, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  emptyTitle = 'No jobs found',
  emptyDescription = 'Try adjusting your filters or search terms'
}: JobListProps) {
  // Show loading state
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-48 bg-muted rounded" />
                  <div className="h-5 w-20 bg-muted rounded" />
                </div>
                <div className="h-4 w-64 bg-muted rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-muted rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
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
        <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <SearchX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{emptyDescription}</p>
        </CardContent>
      </Card>
    )
  }

  // Show job list
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-1', className)}>
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
  return (
    <div className={cn('space-y-4', className)}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">{title}</h2>
              {!loading && jobs.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({jobs.length} {jobs.length === 1 ? 'job' : 'jobs'})
                </span>
              )}
            </div>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
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
