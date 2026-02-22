import React from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JobWithRelations } from '@/lib/types/job'
import { formatIDR } from '@/lib/utils/currency'
import { formatDateIndo } from '@/lib/utils/date'
import { isUMKCompliant } from '@/lib/constants/wage'
import { MapPin, Calendar, Banknote, Building2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobCardProps {
  job: JobWithRelations
  onClick?: () => void
  className?: string
}

export function JobCard({ job, onClick, className }: JobCardProps) {
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {job.title}
              </h3>
              {isRateBaliCompliant && (
                <Badge
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-xs"
                >
                  Rate Bali
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{job.business.name}</span>
              {job.business.is_verified && (
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Category */}
        <Badge variant="secondary" className="text-xs">
          {job.category.name}
        </Badge>

        {/* Wage */}
        <div className="flex items-center gap-2 text-sm">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{formatWageRange()}</span>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{job.address}</span>
        </div>

        {/* Distance (if available) */}
        {job.distance !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{job.distance < 1 ? `${(job.distance * 1000).toFixed(0)} m` : `${job.distance.toFixed(1)} km`}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Deadline: {formatDateIndo(job.deadline)}</span>
        </div>
      </CardFooter>
    </Card>
  )
}
