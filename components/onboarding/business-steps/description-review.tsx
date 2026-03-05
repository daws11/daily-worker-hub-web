"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, FileText, Building2, MapPin, Phone, Mail, Briefcase } from "lucide-react"
import { OnboardingDraft } from "@/lib/utils/draft-storage"

interface BusinessDescriptionReviewProps {
  value: Pick<OnboardingDraft, 'description' | 'website'>
  identityInfo: Pick<OnboardingDraft, 'businessName' | 'businessType' | 'businessPhone' | 'businessEmail'>
  locationInfo: Pick<OnboardingDraft, 'businessAddress' | 'businessLat' | 'businessLng'>
  onChange: (data: Pick<OnboardingDraft, 'description' | 'website'>) => void
  onValidChange: (isValid: boolean) => void
  onTermsChange: (accepted: boolean) => void
}

export function BusinessDescriptionReview({
  value,
  identityInfo,
  locationInfo,
  onChange,
  onValidChange,
  onTermsChange,
}: BusinessDescriptionReviewProps) {
  const [description, setDescription] = useState(value.description || "")
  const [website, setWebsite] = useState(value.website || "")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    // Website validation (optional, but if provided must be valid)
    if (website.trim()) {
      try {
        // Add protocol if missing
        const urlToTest = website.startsWith('http') ? website : `https://${website}`
        new URL(urlToTest)
      } catch {
        newErrors.website = "Please enter a valid website URL"
      }
    }

    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0 && termsAccepted
    onValidChange(isValid)

    // Notify parent of changes
    onChange({ description, website })
  }, [description, website, termsAccepted, onValidChange, onChange])

  const handleTermsChange = (checked: boolean) => {
    setTermsAccepted(checked)
    onTermsChange(checked)
  }

  // Format website URL for display
  const formatWebsite = (url: string) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `https://${url}`
  }

  // Get business type display label
  const getBusinessTypeLabel = (type: string | undefined) => {
    if (!type) return type
    return type.replace('/', ' / ')
  }

  return (
    <div className="space-y-6">
      {/* Description Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Business Description</h3>
          <p className="text-sm text-muted-foreground">
            Tell workers about your business (optional).
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Business Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <Textarea
              id="description"
              placeholder="Tell workers about your business, what you do, and what makes your workplace great..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right mt-1">
              {description.length}/500
            </div>
          </div>
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">
            Website <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="website"
              type="url"
              placeholder="www.yourbusiness.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="pl-9"
            />
          </div>
          {errors.website && (
            <p className="text-sm text-destructive">{errors.website}</p>
          )}
        </div>
      </div>

      {/* Review Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Review Your Business Profile
          </h3>
          <p className="text-sm text-muted-foreground">
            Please review your information before completing your profile.
          </p>
        </div>

        <div className="grid gap-4">
          {/* Business Identity Review */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Business Name</span>
                <span className="font-medium">{identityInfo.businessName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Business Type</span>
                <Badge variant="secondary">
                  {getBusinessTypeLabel(identityInfo.businessType)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{identityInfo.businessPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{identityInfo.businessEmail}</span>
              </div>
            </CardContent>
          </Card>

          {/* Location Review */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{locationInfo.businessAddress}</p>
            </CardContent>
          </Card>

          {/* Additional Info Review */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {website && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Website</span>
                  <a 
                    href={formatWebsite(website)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {website}
                  </a>
                </div>
              )}
              {description && (
                <div className="pt-2">
                  <span className="text-muted-foreground">Description</span>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{description}</p>
                </div>
              )}
              {!website && !description && (
                <p className="text-muted-foreground text-xs italic">No additional information provided</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={handleTermsChange}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
            I agree to the{' '}
            <a href="/terms" className="text-primary hover:underline" target="_blank">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:underline" target="_blank">
              Privacy Policy
            </a>
            . I understand that my business information will be visible to workers on the platform.
          </Label>
        </div>
      </div>
    </div>
  )
}
