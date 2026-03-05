"use client"

import { useState, useEffect } from "react"
import { OnboardingDraft } from "@/lib/utils/draft-storage"
import { LocationPicker, LocationData } from "@/components/onboarding/location-picker"

interface LocationStepProps {
  value: Pick<OnboardingDraft, 'address' | 'lat' | 'lng'>
  onChange: (data: Pick<OnboardingDraft, 'address' | 'lat' | 'lng'>) => void
  onValidChange: (isValid: boolean) => void
}

export function LocationStep({ 
  value, 
  onChange, 
  onValidChange 
}: LocationStepProps) {
  const [locationData, setLocationData] = useState<LocationData>({
    lat: value.lat ?? 0,
    lng: value.lng ?? 0,
    address: value.address || ""
  })

  // Validate form
  useEffect(() => {
    const isValid = !!(locationData.address && locationData.lat && locationData.lng)
    onValidChange(isValid)
    
    // Notify parent of changes
    onChange({
      address: locationData.address,
      lat: locationData.lat,
      lng: locationData.lng
    })
  }, [locationData, onValidChange, onChange])

  const handleLocationChange = (newLocation: LocationData) => {
    setLocationData(newLocation)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Your Location</h3>
        <p className="text-sm text-muted-foreground">
          Set your location to help businesses find you. Your location helps match you with nearby jobs.
        </p>
      </div>

      <LocationPicker
        value={locationData}
        onChange={handleLocationChange}
      />
    </div>
  )
}
