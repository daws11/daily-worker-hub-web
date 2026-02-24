"use client"

import React from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JobWithRelations } from '@/lib/types/job'
import { formatIDR } from '@/lib/utils/currency'
import { formatDateIndo } from '@/lib/utils/date'
import { isUMKCompliant } from '@/lib/constants/wage'
import { MapPin, Calendar, Banknote, Building2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/hooks'

interface JobCardProps {
  job: JobWithRelations
  onClick?: () => void
  className?: string
}

export function JobCard({ job, onClick, className }: JobCardProps) {
  const { t } = useTranslation()

  // Check if job is Rate Bali compliant (using minimum wage)
  const isRateBaliCompliant = isUMKCompliant(job.budget_min, job.address)

  // Format wage range
  const formatWageRange = () => {
    if (job.budget_min === job.budget_max) {
      return formatIDR(job.budget_min)
    }
    return `${formatIDR(job.budget_min)} - ${formatIDR(job.budget_max)}`
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50',
        onClick && 'group',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="font-semibold text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {job.title}
              </h3>
              {isRateBaliCompliant && (
                <Badge
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-[10px] sm:text-xs"
                >
                  {t('jobs.rateBali')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <span className="line-clamp-1">{job.business.name}</span>
              {job.business.is_verified && (
                <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 sm:space-y-3 pb-2 sm:pb-3 px-3 sm:px-6">
        {/* Category */}
        <Badge variant="secondary" className="text-[10px] sm:text-xs">
          {job.category.name}
        </Badge>

        {/* Wage */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{formatWageRange()}</span>
        </div>

        {/* Location */}
        <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{job.address}</span>
        </div>

        {/* Distance (if available) */}
        {job.distance !== undefined && (
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span>{job.distance < 1 ? `${(job.distance * 1000).toFixed(0)} m` : `${job.distance.toFixed(1)} km`}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 sm:pt-3 border-t px-3 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="line-clamp-1">{t('jobs.deadlineLabel')} {formatDateIndo(job.deadline)}</span>
        </div>
      </CardFooter>
    </Card>
  )
}
