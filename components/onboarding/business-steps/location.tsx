"use client";

import { useState, useEffect } from "react";
import { OnboardingDraft } from "@/lib/utils/draft-storage";
import {
  LocationPicker,
  LocationData,
} from "@/components/onboarding/location-picker";

interface BusinessLocationProps {
  value: Pick<
    OnboardingDraft,
    "businessAddress" | "businessLat" | "businessLng"
  >;
  onChange: (
    data: Pick<
      OnboardingDraft,
      "businessAddress" | "businessLat" | "businessLng"
    >,
  ) => void;
  onValidChange: (isValid: boolean) => void;
}

export function BusinessLocation({
  value,
  onChange,
  onValidChange,
}: BusinessLocationProps) {
  const [locationData, setLocationData] = useState<LocationData>({
    lat: value.businessLat ?? 0,
    lng: value.businessLng ?? 0,
    address: value.businessAddress || "",
  });

  // Validate form
  useEffect(() => {
    const isValid = !!(
      locationData.address &&
      locationData.lat &&
      locationData.lng
    );
    onValidChange(isValid);

    // Notify parent of changes
    onChange({
      businessAddress: locationData.address,
      businessLat: locationData.lat,
      businessLng: locationData.lng,
    });
  }, [locationData, onValidChange, onChange]);

  const handleLocationChange = (newLocation: LocationData) => {
    setLocationData(newLocation);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Business Location</h3>
        <p className="text-sm text-muted-foreground">
          Set your business location to help workers find you. Your location
          helps match you with nearby workers.
        </p>
      </div>

      <LocationPicker value={locationData} onChange={handleLocationChange} />
    </div>
  );
}
