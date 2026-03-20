"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User, Phone, Calendar } from "lucide-react";
import { OnboardingDraft } from "@/lib/utils/draft-storage";

interface PersonalInfoProps {
  value: Pick<OnboardingDraft, "fullName" | "phone" | "dob">;
  onChange: (data: Pick<OnboardingDraft, "fullName" | "phone" | "dob">) => void;
  onValidChange: (isValid: boolean) => void;
  initialFullName?: string;
}

export function PersonalInfo({
  value,
  onChange,
  onValidChange,
  initialFullName,
}: PersonalInfoProps) {
  const [fullName, setFullName] = useState(
    value.fullName || initialFullName || "",
  );
  const [phone, setPhone] = useState(value.phone || "");
  const [dob, setDob] = useState(value.dob || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill full name from initial value if not already set
  useEffect(() => {
    if (initialFullName && !value.fullName) {
      setFullName(initialFullName);
    }
  }, [initialFullName, value.fullName]);

  // Validate form on change
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    // Full name validation
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    // Phone validation (Indonesia format: +62 or 08xx)
    const phoneClean = phone.replace(/[\s-]/g, "");
    if (!phoneClean) {
      newErrors.phone = "Phone number is required";
    } else if (!/^(\+62|62|0)8[1-9][0-9]{7,10}$/.test(phoneClean)) {
      newErrors.phone =
        "Please enter a valid Indonesian phone number (e.g., +6281234567890)";
    }

    // Date of birth validation (must be 18+)
    if (!dob) {
      newErrors.dob = "Date of birth is required";
    } else {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = Math.floor(
        (today.getTime() - birthDate.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      );
      if (age < 18) {
        newErrors.dob = "You must be at least 18 years old";
      } else if (birthDate > today) {
        newErrors.dob = "Date of birth cannot be in the future";
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidChange(isValid);

    // Notify parent of changes
    onChange({ fullName, phone, dob });
  }, [fullName, phone, dob, onValidChange, onChange]);

  // Format phone number to +62 format
  const formatPhone = (value: string) => {
    // Remove non-digits
    let cleaned = value.replace(/\D/g, "");

    // Add +62 prefix if needed
    if (cleaned.startsWith("62")) {
      cleaned = "+" + cleaned;
    } else if (cleaned.startsWith("0")) {
      cleaned = "+62" + cleaned.slice(1);
    } else if (cleaned && !cleaned.startsWith("+")) {
      cleaned = "+62" + cleaned;
    }

    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow typing with or without +, we'll format on blur
    setPhone(value);
  };

  const handlePhoneBlur = () => {
    if (phone) {
      setPhone(formatPhone(phone));
    }
  };

  // Get max date for date picker (18 years ago)
  const getMaxDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        <p className="text-sm text-muted-foreground">
          Tell us a bit about yourself. This information will be visible to
          potential employers.
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="fullName"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-9"
          />
        </div>
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName}</p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+62 812 3456 7890"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            className="pl-9"
          />
        </div>
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Use Indonesian format (+62 or 08xx)
        </p>
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="dob">
          Date of Birth <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={getMaxDate()}
            className="pl-9"
          />
        </div>
        {errors.dob && <p className="text-sm text-destructive">{errors.dob}</p>}
        <p className="text-xs text-muted-foreground">
          You must be at least 18 years old to work
        </p>
      </div>
    </div>
  );
}
