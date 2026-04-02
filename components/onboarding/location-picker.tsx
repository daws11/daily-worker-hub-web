"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation } from "lucide-react";

// Custom marker icon using inline SVG data URL (avoids CSP issues)
const customIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="25" height="41">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#3b82f6"/>
      <circle cx="12.5" cy="12.5" r="6" fill="white"/>
    </svg>
  `),
  shadowUrl: "",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [0, 0],
});

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  value?: LocationData;
  onChange: (location: LocationData) => void;
  error?: string;
}

// Component to handle map clicks and marker dragging
function MapEventHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to update map view when location changes
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

// Draggable marker component
function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const [draggable, setDraggable] = useState(true);

  const eventHandlers = {
    dragend(e: any) {
      const marker = e.target;
      const position = marker.getLatLng();
      onDragEnd(position.lat, position.lng);
    },
  };

  return (
    <Marker
      draggable={draggable}
      eventHandlers={eventHandlers}
      position={position}
      icon={customIcon}
    />
  );
}

// Reverse geocoding using Nominatim API (free)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Simple throttle to respect Nominatim's 1 req/sec limit
  const now = Date.now();
  if (reverseGeocode.lastRequest && now - reverseGeocode.lastRequest < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - (now - reverseGeocode.lastRequest)));
  }
  reverseGeocode.lastRequest = Date.now();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "id,en",
          "User-Agent": "DailyWorkerHub/1.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
reverseGeocode.lastRequest = 0;

// Default center for Bali, Indonesia
const BALI_CENTER: [number, number] = [-8.4095, 115.1889];

export function LocationPicker({
  value,
  onChange,
  error,
}: LocationPickerProps) {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressInput, setAddressInput] = useState(value?.address || "");
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(
    value?.lat && value?.lng ? [value.lat, value.lng] : BALI_CENTER,
  );

  // Update address input when value changes externally
  useEffect(() => {
    if (value?.address) {
      setAddressInput(value.address);
    }
    if (value?.lat && value?.lng) {
      setMarkerPosition([value.lat, value.lng]);
    }
  }, [value]);

  const handleLocationSelect = useCallback(
    async (lat: number, lng: number) => {
      setMarkerPosition([lat, lng]);
      setIsGeocoding(true);

      try {
        const address = await reverseGeocode(lat, lng);
        setAddressInput(address);
        onChange({ lat, lng, address });
      } catch (error) {
        console.error("Error in handleLocationSelect:", error);
        onChange({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      } finally {
        setIsGeocoding(false);
      }
    },
    [onChange],
  );

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await handleLocationSelect(latitude, longitude);
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Unable to get your location";
        if (error && typeof error === "object") {
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage =
                "Location permission denied. Please enable location access in your browser settings.";
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = "Location information is currently unavailable.";
              break;
            case 3: // TIMEOUT
              errorMessage = "Location request timed out. Please try again.";
              break;
            default:
              errorMessage = "Unable to get your location. Please try again or select location manually on the map.";
          }
        }
        alert(errorMessage);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [handleLocationSelect]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressInput(e.target.value);
  };

  const handleAddressBlur = () => {
    // Only update if address changed and we have coordinates
    if (addressInput !== value?.address && value?.lat && value?.lng) {
      onChange({ ...value, address: addressInput });
    }
  };

  return (
    <div className="space-y-4">
      {/* Address Input */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="address"
            placeholder="Enter your address or use the map"
            value={addressInput}
            onChange={handleAddressChange}
            onBlur={handleAddressBlur}
            className="pl-9"
          />
          {isGeocoding && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Use Current Location Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGetCurrentLocation}
        disabled={isLoadingLocation}
        className="w-full gap-2"
      >
        {isLoadingLocation ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Getting Location...
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" />
            Use Current Location
          </>
        )}
      </Button>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border shadow-sm aspect-[4/3] sm:aspect-video w-full">
        <MapContainer
          center={markerPosition}
          zoom={13}
          scrollWheelZoom={true}
          zoomControl={false}
          className="h-full w-full rounded-xl"
        >
          <TileLayer
            attribution={""}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventHandler onLocationSelect={handleLocationSelect} />
          <MapUpdater center={markerPosition} />
          <DraggableMarker
            position={markerPosition}
            onDragEnd={(lat, lng) => handleLocationSelect(lat, lng)}
          />
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Click on the map or drag the marker to set your location
      </p>
    </div>
  );
}
