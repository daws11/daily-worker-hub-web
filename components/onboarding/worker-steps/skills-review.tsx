"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Award,
  FileText,
  CheckCircle2,
  User,
  MapPin,
  Phone,
  Calendar,
} from "lucide-react";
import { OnboardingDraft } from "@/lib/utils/draft-storage";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface SkillsReviewProps {
  value: Pick<OnboardingDraft, "primaryCategory" | "experienceLevel" | "bio">;
  personalInfo: Pick<OnboardingDraft, "fullName" | "phone" | "dob">;
  locationInfo: Pick<OnboardingDraft, "address" | "lat" | "lng">;
  onChange: (
    data: Pick<OnboardingDraft, "primaryCategory" | "experienceLevel" | "bio">,
  ) => void;
  onValidChange: (isValid: boolean) => void;
  onTermsChange: (accepted: boolean) => void;
}

const EXPERIENCE_LEVELS = [
  {
    value: "Beginner" as const,
    label: "Beginner",
    description: "Less than 1 year",
  },
  {
    value: "Intermediate" as const,
    label: "Intermediate",
    description: "1-3 years",
  },
  { value: "Advanced" as const, label: "Advanced", description: "3-5 years" },
  { value: "Expert" as const, label: "Expert", description: "5+ years" },
];

export function SkillsReview({
  value,
  personalInfo,
  locationInfo,
  onChange,
  onValidChange,
  onTermsChange,
}: SkillsReviewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [primaryCategory, setPrimaryCategory] = useState(
    value.primaryCategory || "",
  );
  const [experienceLevel, setExperienceLevel] = useState<
    "" | "Beginner" | "Intermediate" | "Advanced" | "Expert"
  >(value.experienceLevel || "");
  const [bio, setBio] = useState(value.bio || "");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        if (data.data) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!primaryCategory) {
      newErrors.primaryCategory = "Please select your primary skill category";
    }
    if (!experienceLevel) {
      newErrors.experienceLevel = "Please select your experience level";
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0 && termsAccepted;
    onValidChange(isValid);

    // Notify parent of changes
    onChange({
      primaryCategory,
      experienceLevel: (experienceLevel || undefined) as
        | "Beginner"
        | "Intermediate"
        | "Advanced"
        | "Expert"
        | undefined,
      bio,
    });
  }, [
    primaryCategory,
    experienceLevel,
    bio,
    termsAccepted,
    onValidChange,
    onChange,
  ]);

  const handleTermsChange = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setTermsAccepted(isChecked);
    onTermsChange(isChecked);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || categoryId;
  };

  return (
    <div className="space-y-6">
      {/* Skills Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Skills & Experience</h3>
          <p className="text-sm text-muted-foreground">
            Tell us about your primary skill and experience level.
          </p>
        </div>

        {/* Primary Category */}
        <div className="space-y-2">
          <Label htmlFor="category">
            Primary Skill Category <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Select
              value={primaryCategory}
              onValueChange={(value) => setPrimaryCategory(value as string)}
              disabled={categoriesLoading}
            >
              <SelectTrigger className="pl-9">
                <SelectValue
                  placeholder={
                    categoriesLoading
                      ? "Loading..."
                      : "Select your primary skill"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.primaryCategory && (
            <p className="text-sm text-destructive">{errors.primaryCategory}</p>
          )}
        </div>

        {/* Experience Level */}
        <div className="space-y-2">
          <Label htmlFor="experience">
            Experience Level <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setExperienceLevel(level.value)}
                className={`flex flex-col items-start p-3 rounded-lg border transition-all text-left ${
                  experienceLevel === level.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="font-medium">{level.label}</span>
                <span className="text-xs text-muted-foreground">
                  {level.description}
                </span>
              </button>
            ))}
          </div>
          {errors.experienceLevel && (
            <p className="text-sm text-destructive">{errors.experienceLevel}</p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">
            Bio <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <Textarea
              id="bio"
              placeholder="Tell businesses about yourself, your experience, and what makes you a great worker..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right mt-1">
              {bio.length}/500
            </div>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Review Your Profile
          </h3>
          <p className="text-sm text-muted-foreground">
            Please review your information before completing your profile.
          </p>
        </div>

        <div className="grid gap-4">
          {/* Personal Info Review */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium">{personalInfo.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{personalInfo.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">
                  {formatDate(personalInfo.dob || "")}
                </span>
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
              <p className="text-sm">{locationInfo.address}</p>
            </CardContent>
          </Card>

          {/* Skills Review */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4" />
                Skills & Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Primary Category</span>
                <Badge variant="secondary">
                  {getCategoryName(primaryCategory)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Experience Level</span>
                <Badge variant="outline">{experienceLevel}</Badge>
              </div>
              {bio && (
                <div className="pt-2">
                  <span className="text-muted-foreground">Bio</span>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {bio}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex gap-3">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={handleTermsChange}
            className="mt-0.5 shrink-0"
          />
          <Label
            htmlFor="terms"
            className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
          >
            I agree to the{" "}
            <a
              href="/terms"
              className="text-primary hover:underline font-medium"
              target="_blank"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="text-primary hover:underline font-medium"
              target="_blank"
            >
              Privacy Policy
            </a>
            . I understand that my information will be used to match me with job
            opportunities.
          </Label>
        </div>
      </div>
    </div>
  );
}
