"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useTranslation } from "@/lib/i18n/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Save,
  MapPin,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { getCategories } from "@/lib/actions/categories";
import { getBusinessProfile } from "@/lib/actions/business";
import { createJob } from "@/lib/actions/jobs";

interface JobFormData {
  title: string;
  description: string;
  requirements: string;
  category_id: string;
  budget_min: string;
  budget_max: string;
  hours_needed: string;
  address: string;
  deadline: string;
  is_urgent: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export default function JobForm() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);

  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    description: "",
    requirements: "",
    category_id: "",
    budget_min: "",
    budget_max: "",
    hours_needed: "4",
    address: "",
    deadline: "",
    is_urgent: false,
  });

  // Fetch categories and business profile on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setInitialLoading(true);

        // Fetch categories using server action
        const catsResult = await getCategories();
        console.log("Categories response:", catsResult);
        if (catsResult.success && catsResult.data) {
          setCategories(catsResult.data);
        }

        // Fetch business profile using server action
        if (user?.id) {
          const bizResult = await getBusinessProfile(user.id);
          console.log("Business response:", bizResult);
          if (bizResult.success && bizResult.data) {
            setBusiness(bizResult.data);
            // Pre-fill address if available
            if (bizResult.data.address) {
              setFormData((prev) => ({
                ...prev,
                address: bizResult.data.address || "",
              }));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Job title is required");
      return false;
    }

    if (!formData.description.trim()) {
      setError("Job description is required");
      return false;
    }

    if (!formData.category_id) {
      setError("Please select a category");
      return false;
    }

    const minBudget = parseFloat(formData.budget_min);
    const maxBudget = parseFloat(formData.budget_max);

    if (isNaN(minBudget) || minBudget < 0) {
      setError("Minimum budget must be a valid positive number");
      return false;
    }

    if (isNaN(maxBudget) || maxBudget < 0) {
      setError("Maximum budget must be a valid positive number");
      return false;
    }

    if (maxBudget < minBudget) {
      setError(
        "Maximum budget must be greater than or equal to minimum budget",
      );
      return false;
    }

    const hoursNeeded = parseInt(formData.hours_needed);
    if (isNaN(hoursNeeded) || hoursNeeded < 4 || hoursNeeded > 12) {
      setError("Hours needed must be between 4 and 12");
      return false;
    }

    if (!formData.address.trim()) {
      setError("Job address is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    if (!business) {
      setError(
        "Business profile not found. Please complete your business profile first.",
      );
      return;
    }

    setLoading(true);

    try {
      const result = await createJob({
        businessId: user?.id || "",
        title: formData.title.trim(),
        positionType: "full-time", // default
        deadline: formData.deadline || "",
        address: formData.address.trim(),
        budgetMin: parseFloat(formData.budget_min),
        budgetMax: parseFloat(formData.budget_max),
        wageMin: parseFloat(formData.budget_min),
        wageMax: parseFloat(formData.budget_max),
        workersNeeded: 1,
        hoursNeeded: parseInt(formData.hours_needed),
        description: formData.description.trim(),
        requirements: formData.requirements.split("\n").filter((r) => r.trim()),
        area: formData.address.trim(),
      });

      if (result.success) {
        toast.success("Job created successfully!");
        // Redirect to jobs list
        router.push("/business/jobs");
      } else {
        const message = result.error || "Failed to create job";
        setError(message);
        toast.error(message);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create job";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background p-4">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-card dark:bg-card border border-border rounded-md cursor-pointer text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold m-0">Create New Job</h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive m-0 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card dark:bg-card rounded-lg shadow-sm p-6"
        >
          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Job Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Driver for Hotel Event"
              required
              disabled={loading}
              className="w-full p-2.5 border border-border rounded-md text-sm bg-background dark:bg-background disabled:bg-muted"
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Category *
            </label>
            {initialLoading ? (
              <div className="p-2.5 border border-border rounded-md text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="p-2.5 border border-destructive/20 rounded-md text-sm text-destructive bg-destructive/10">
                No categories available. Please contact admin.
              </div>
            ) : (
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full p-2.5 border border-border rounded-md text-sm bg-card dark:bg-card"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the job role and responsibilities..."
              required
              disabled={loading}
              rows={5}
              className="w-full p-2.5 border border-border rounded-md text-sm resize-y bg-background dark:bg-background disabled:bg-muted"
            />
          </div>

          {/* Requirements */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Requirements
            </label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              placeholder="List any specific skills or experience required..."
              disabled={loading}
              rows={3}
              className="w-full p-2.5 border border-border rounded-md text-sm resize-y bg-background dark:bg-background disabled:bg-muted"
            />
          </div>

          {/* Budget Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Min Budget (IDR) *
                </div>
              </label>
              <input
                type="number"
                name="budget_min"
                value={formData.budget_min}
                onChange={handleChange}
                placeholder="e.g., 100000"
                required
                disabled={loading}
                min="0"
                className="w-full p-2.5 border border-border rounded-md text-sm bg-background dark:bg-background disabled:bg-muted"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Max Budget (IDR) *
                </div>
              </label>
              <input
                type="number"
                name="budget_max"
                value={formData.budget_max}
                onChange={handleChange}
                placeholder="e.g., 150000"
                required
                disabled={loading}
                min="0"
                className="w-full p-2.5 border border-border rounded-md text-sm bg-background dark:bg-background disabled:bg-muted"
              />
            </div>
          </div>

          {/* Hours Needed */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Hours Needed (4-12 hours)
              </div>
            </label>
            <input
              type="number"
              name="hours_needed"
              value={formData.hours_needed}
              onChange={handleChange}
              required
              disabled={loading}
              min="4"
              max="12"
              className="w-full p-2.5 border border-border rounded-md text-sm bg-background dark:bg-background disabled:bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 4 hours, maximum 12 hours
            </p>
          </div>

          {/* Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Job Address *
              </div>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g., Jl. Raya Ubud No. 123, Ubud, Bali"
              required
              disabled={loading}
              rows={2}
              className="w-full p-2.5 border border-border rounded-md text-sm resize-y bg-background dark:bg-background disabled:bg-muted"
            />
          </div>

          {/* Deadline */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Deadline (Optional)
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              disabled={loading}
              className="w-full p-2.5 border border-border rounded-md text-sm bg-background dark:bg-background disabled:bg-muted"
            />
          </div>

          {/* Is Urgent */}
          <div className="mb-8">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_urgent"
                checked={formData.is_urgent}
                onChange={handleChange}
                disabled={loading}
                className="w-4.5 h-4.5 cursor-pointer"
              />
              <span className="text-sm text-foreground">
                Mark this job as urgent
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="px-5 py-2.5 bg-card dark:bg-card border border-border rounded-md text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground border-none rounded-md text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
