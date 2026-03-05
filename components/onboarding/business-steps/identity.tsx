"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Phone, Mail, Briefcase } from "lucide-react"
import { OnboardingDraft } from "@/lib/utils/draft-storage"

interface BusinessIdentityProps {
  value: Pick<OnboardingDraft, 'businessName' | 'businessType' | 'businessPhone' | 'businessEmail'>
  onChange: (data: Pick<OnboardingDraft, 'businessName' | 'businessType' | 'businessPhone' | 'businessEmail'>) => void
  onValidChange: (isValid: boolean) => void
  initialEmail?: string
}

const BUSINESS_TYPES = [
  { value: 'Hotel/Villa', label: 'Hotel / Villa' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Event Venue', label: 'Event Venue' },
  { value: 'Spa/Wellness', label: 'Spa / Wellness' },
  { value: 'Other', label: 'Other' },
] as const

export function BusinessIdentity({ 
  value, 
  onChange, 
  onValidChange,
  initialEmail 
}: BusinessIdentityProps) {
  const [businessName, setBusinessName] = useState(value.businessName || "")
  const [businessType, setBusinessType] = useState<OnboardingDraft['businessType']>(value.businessType || undefined)
  const [businessPhone, setBusinessPhone] = useState(value.businessPhone || "")
  const [businessEmail, setBusinessEmail] = useState(value.businessEmail || initialEmail || "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-fill email from initial value if not already set
  useEffect(() => {
    if (initialEmail && !value.businessEmail) {
      setBusinessEmail(initialEmail)
    }
  }, [initialEmail, value.businessEmail])

  // Validate form on change
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    // Business name validation
    if (!businessName.trim()) {
      newErrors.businessName = "Business name is required"
    } else if (businessName.trim().length < 2) {
      newErrors.businessName = "Business name must be at least 2 characters"
    }

    // Business type validation
    if (!businessType) {
      newErrors.businessType = "Please select a business type"
    }

    // Phone validation (Indonesia format: +62 or 08xx)
    const phoneClean = businessPhone.replace(/[\s-]/g, "")
    if (!phoneClean) {
      newErrors.businessPhone = "Phone number is required"
    } else if (!/^(\+62|62|0)8[1-9][0-9]{7,10}$/.test(phoneClean)) {
      newErrors.businessPhone = "Please enter a valid Indonesian phone number (e.g., +6281234567890)"
    }

    // Email validation
    if (!businessEmail.trim()) {
      newErrors.businessEmail = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
      newErrors.businessEmail = "Please enter a valid email address"
    }

    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0
    onValidChange(isValid)

    // Notify parent of changes
    onChange({ businessName, businessType, businessPhone, businessEmail })
  }, [businessName, businessType, businessPhone, businessEmail, onValidChange, onChange])

  // Format phone number to +62 format
  const formatPhone = (value: string) => {
    // Remove non-digits
    let cleaned = value.replace(/\D/g, "")
    
    // Add +62 prefix if needed
    if (cleaned.startsWith("62")) {
      cleaned = "+" + cleaned
    } else if (cleaned.startsWith("0")) {
      cleaned = "+62" + cleaned.slice(1)
    } else if (cleaned && !cleaned.startsWith("+")) {
      cleaned = "+62" + cleaned
    }
    
    return cleaned
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow typing with or without +, we'll format on blur
    setBusinessPhone(value)
  }

  const handlePhoneBlur = () => {
    if (businessPhone) {
      setBusinessPhone(formatPhone(businessPhone))
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Business Identity</h2>
        <p className="text-sm text-muted-foreground">
          Tell us about your business. This information will be visible to workers looking for jobs.
        </p>
      </div>

      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName">
          Business Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="businessName"
            placeholder="Enter your business name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="pl-9"
          />
        </div>
        {errors.businessName && (
          <p className="text-sm text-destructive">{errors.businessName}</p>
        )}
      </div>

      {/* Business Type */}
      <div className="space-y-2">
        <Label htmlFor="businessType">
          Business Type <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Select
            value={businessType || ""}
            onValueChange={(value) => setBusinessType(value as typeof businessType)}
          >
            <SelectTrigger className="pl-9">
              <SelectValue placeholder="Select your business type" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {errors.businessType && (
          <p className="text-sm text-destructive">{errors.businessType}</p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="businessPhone">
          Phone Number <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="businessPhone"
            type="tel"
            placeholder="+62 812 3456 7890"
            value={businessPhone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            className="pl-9"
          />
        </div>
        {errors.businessPhone && (
          <p className="text-sm text-destructive">{errors.businessPhone}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Use Indonesian format (+62 or 08xx)
        </p>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="businessEmail">
          Email <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="businessEmail"
            type="email"
            placeholder="business@example.com"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            className="pl-9"
          />
        </div>
        {errors.businessEmail && (
          <p className="text-sm text-destructive">{errors.businessEmail}</p>
        )}
      </div>
    </div>
  )
}
