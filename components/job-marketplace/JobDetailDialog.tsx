"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { JobWithRelations } from '@/lib/types/job'
import { formatIDR } from '@/lib/utils/currency'
import { formatDateIndo } from '@/lib/utils/date'
import { isUMKCompliant } from '@/lib/constants/wage'
import {
  MapPin,
  Calendar,
  Banknote,
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobDetailDialogProps {
  job: JobWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply?: (job: JobWithRelations) => void
  isApplying?: boolean
}

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
  onApply,
  isApplying = false,
}: JobDetailDialogProps) {
  if (!job) return null

  const isRateBaliCompliant = isUMKCompliant(job.budget_min, job.address)

  const formatWageRange = () => {
    if (job.budget_min === job.budget_max) {
      return formatIDR(job.budget_min)
    }
    return `${formatIDR(job.budget_min)} - ${formatIDR(job.budget_max)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-xl">{job.title}</DialogTitle>
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
              <Building2 className="h-4 w-4" />
              <span>{job.business.name}</span>
              {job.business.is_verified && (
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{job.category.name}</Badge>
          </div>

          {/* Wage */}
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Wage Range</p>
              <p className="font-semibold text-lg">{formatWageRange()}</p>
            </div>
          </div>

          <Separator />

          {/* Job Details */}
          <div className="space-y-4">
            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{job.address}</p>
              </div>
            </div>

            {/* Deadline */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Application Deadline</p>
                <p className="text-sm text-muted-foreground">{formatDateIndo(job.deadline)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Job Description */}
          <div className="space-y-2">
            <h3 className="font-semibold">Job Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {job.description}
            </p>
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <h3 className="font-semibold">Requirements</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {job.requirements}
            </p>
          </div>

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill.id} variant="outline">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Business Profile */}
          <div className="space-y-3">
            <h3 className="font-semibold">Business Profile</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{job.business.name}</span>
                {job.business.is_verified && (
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                )}
              </div>
              {job.business.description && (
                <p className="text-sm text-muted-foreground">{job.business.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {job.business.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{job.business.email}</span>
                  </div>
                )}
                {job.business.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{job.business.phone}</span>
                  </div>
                )}
                {job.business.website && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <a
                      href={job.business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {job.business.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {onApply && (
            <Button
              type="button"
              onClick={() => onApply(job)}
              disabled={isApplying}
            >
              {isApplying ? 'Applying...' : 'Apply for Job'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
