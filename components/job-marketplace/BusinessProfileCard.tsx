import React from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Business } from '@/lib/types/job'
import { Building2, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessProfileCardProps {
  business: Business
  onViewProfile?: () => void
  className?: string
}

export function BusinessProfileCard({
  business,
  onViewProfile,
  className,
}: BusinessProfileCardProps) {
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/)
    if (words.length === 0) return '?'
    if (words.length === 1) return words[0].charAt(0).toUpperCase()
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(business.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{business.name}</h3>
              {business.is_verified && (
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>Business</span>
            </div>
          </div>
        </div>
      </CardHeader>

      {business.description && (
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {business.description}
          </p>
        </CardContent>
      )}

      {onViewProfile && (
        <CardFooter className="pt-0 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewProfile}
            className="w-full"
          >
            View Full Profile
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
