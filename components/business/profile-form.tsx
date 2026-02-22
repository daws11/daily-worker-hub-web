"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Camera, FileText, User, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"

import {
  businessProfileSchema,
  type BusinessProfileInput,
  type BusinessType,
  type Area,
} from "@/lib/schemas/business"
import { uploadAvatar, uploadBusinessLicense } from "@/lib/supabase/storage"

// Business type options in Indonesian
const businessTypeOptions: { value: BusinessType; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "villa", label: "Villa" },
  { value: "restaurant", label: "Restoran" },
  { value: "event_company", label: "Perusahaan Event" },
  { value: "other", label: "Lainnya" },
]

// Area options (Bali regencies)
const areaOptions: { value: Area; label: string }[] = [
  { value: "Badung", label: "Badung" },
  { value: "Denpasar", label: "Denpasar" },
  { value: "Gianyar", label: "Gianyar" },
  { value: "Tabanan", label: "Tabanan" },
  { value: "Buleleng", label: "Buleleng" },
  { value: "Klungkung", label: "Klungkung" },
  { value: "Karangasem", label: "Karangasem" },
  { value: "Bangli", label: "Bangli" },
  { value: "Jembrana", label: "Jembrana" },
]

interface BusinessProfile {
  id?: string
  name: string
  business_type: BusinessType
  address: string
  area: Area
  phone?: string
  email?: string
  website?: string
  description?: string
  avatar_url?: string
  business_license_url?: string
}

interface ProfileFormProps {
  mode?: "create" | "edit"
  initialData?: BusinessProfile
  onSubmit?: (data: BusinessProfileInput) => Promise<{ error?: string }>
}

export function ProfileForm({
  mode = "create",
  initialData,
  onSubmit,
}: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    initialData?.avatar_url
  )
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [licenseFileName, setLicenseFileName] = useState<string | undefined>()
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [isUploadingLicense, setIsUploadingLicense] = useState(false)

  const form = useForm<BusinessProfileInput>({
    resolver: zodResolver(businessProfileSchema),
    mode: "onBlur", // Validate on blur for better UX
    defaultValues: initialData || {
      name: "",
      business_type: "hotel",
      address: "",
      area: "Badung",
      phone: "",
      email: "",
      website: "",
      description: "",
      avatar_url: "",
      business_license_url: "",
    },
  })

  const {
    formState: { errors, isValid, isDirty },
  } = form

  // Focus on first error field when form is submitted with errors
  useEffect(() => {
    if (hasSubmitted && Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0] as keyof BusinessProfileInput
      const fieldElement = document.querySelector(
        `[name="${firstErrorField}"]`
      ) as HTMLElement
      fieldElement?.focus()
    }
  }, [hasSubmitted, errors])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous error
    setAvatarError(null)

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const errorMsg = "File harus berupa gambar"
      setAvatarError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      const errorMsg = "Ukuran file maksimal 5MB"
      setAvatarError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setAvatarFile(file)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    toast.success("Foto berhasil dipilih")
  }

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous error
    setLicenseError(null)

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = "File harus berupa PDF atau gambar (JPEG, PNG)"
      setLicenseError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      const errorMsg = "Ukuran file maksimal 10MB"
      setLicenseError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setLicenseFile(file)
    setLicenseFileName(file.name)
    toast.success("Lisensi berhasil dipilih")
  }

  const handleSubmit = async (data: BusinessProfileInput) => {
    setHasSubmitted(true)
    setSubmitError(null)

    // Validate optional fields properly - convert empty strings to undefined
    const sanitizedData: BusinessProfileInput = {
      ...data,
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      website: data.website?.trim() || undefined,
      description: data.description?.trim() || undefined,
      avatar_url: data.avatar_url?.trim() || undefined,
      business_license_url: data.business_license_url?.trim() || undefined,
    }

    setIsSubmitting(true)

    try {
      let avatarUrl = sanitizedData.avatar_url || initialData?.avatar_url
      let licenseUrl = sanitizedData.business_license_url || initialData?.business_license_url

      // Upload avatar if a new file was selected
      if (avatarFile) {
        setIsUploadingAvatar(true)
        try {
          const uploadResult = await uploadAvatar(
            initialData?.id || "temp",
            avatarFile,
            initialData?.avatar_url
          )

          if (uploadResult.error) {
            setAvatarError(uploadResult.error)
            toast.error(`Gagal upload foto: ${uploadResult.error}`)
            setIsUploadingAvatar(false)
            setIsSubmitting(false)
            return
          }

          avatarUrl = uploadResult.url
          setIsUploadingAvatar(false)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Gagal upload foto"
          setAvatarError(errorMsg)
          toast.error(errorMsg)
          setIsUploadingAvatar(false)
          setIsSubmitting(false)
          return
        }
      }

      // Upload business license if a new file was selected
      if (licenseFile) {
        setIsUploadingLicense(true)
        try {
          const uploadResult = await uploadBusinessLicense(
            initialData?.id || "temp",
            licenseFile,
            initialData?.business_license_url
          )

          if (uploadResult.error) {
            setLicenseError(uploadResult.error)
            toast.error(`Gagal upload lisensi: ${uploadResult.error}`)
            setIsUploadingLicense(false)
            setIsSubmitting(false)
            return
          }

          licenseUrl = uploadResult.url
          setIsUploadingLicense(false)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Gagal upload lisensi"
          setLicenseError(errorMsg)
          toast.error(errorMsg)
          setIsUploadingLicense(false)
          setIsSubmitting(false)
          return
        }
      }

      // Prepare form data with avatar and license URLs
      const formData = {
        ...sanitizedData,
        avatar_url: avatarUrl,
        business_license_url: licenseUrl,
      }

      if (onSubmit) {
        try {
          const result = await onSubmit(formData)
          if (result.error) {
            setSubmitError(result.error)
            toast.error(result.error)
            setIsSubmitting(false)
            return
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Gagal menyimpan profil"
          setSubmitError(errorMsg)
          toast.error(errorMsg)
          setIsSubmitting(false)
          return
        }
      }

      // Success toast is handled by parent component (page.tsx)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Terjadi kesalahan tak terduga"
      setSubmitError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Buat Profil Bisnis" : "Edit Profil Bisnis"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Lengkapi informasi bisnis Anda untuk mulai mempekerjakan worker"
            : "Perbarui informasi bisnis Anda"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Submit Error Alert */}
        {hasSubmitted && submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Form-level validation error summary */}
        {hasSubmitted && Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Mohon perbaiki {Object.keys(errors).length} error pada formulir.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
            noValidate
          >
            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="avatar-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  {avatarPreview ? "Ganti Foto" : "Upload Foto"}
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={isSubmitting || isUploadingAvatar}
                />
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarFile(null)
                      setAvatarPreview(undefined)
                      setAvatarError(null)
                    }}
                    disabled={isSubmitting || isUploadingAvatar}
                  >
                    Hapus
                  </Button>
                )}
              </div>
              {isUploadingAvatar && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Mengupload foto...
                </p>
              )}
              {avatarError && (
                <p className="text-xs text-destructive">{avatarError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: JPG, PNG. Maksimal 5MB. Opsional.
              </p>
            </div>

            {/* Company Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Perusahaan *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Contoh: Hotel Bali Indah"
                      {...field}
                      disabled={isSubmitting}
                      aria-invalid={hasSubmitted && !!errors.name}
                    />
                  </FormControl>
                  <FormDescription>
                    Nama resmi perusahaan atau bisnis Anda (1-200 karakter)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business Type */}
            <FormField
              control={form.control}
              name="business_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Bisnis *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger
                        aria-invalid={hasSubmitted && !!errors.business_type}
                      >
                        <SelectValue placeholder="Pilih tipe bisnis" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businessTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Pilih kategori yang paling sesuai dengan bisnis Anda
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Contoh: Jl. Raya Kuta No. 123"
                      {...field}
                      disabled={isSubmitting}
                      aria-invalid={hasSubmitted && !!errors.address}
                    />
                  </FormControl>
                  <FormDescription>
                    Alamat lengkap lokasi bisnis Anda (1-500 karakter)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Area */}
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger
                        aria-invalid={hasSubmitted && !!errors.area}
                      >
                        <SelectValue placeholder="Pilih area" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {areaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Pilih kabupaten/kota lokasi bisnis Anda di Bali
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Telepon</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Contoh: 0361 123456"
                      {...field}
                      disabled={isSubmitting}
                      aria-invalid={hasSubmitted && !!errors.phone}
                    />
                  </FormControl>
                  <FormDescription>
                    Nomor telepon yang bisa dihubungi (opsional, max 20 karakter)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Bisnis</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Contoh: info@hotelbali.com"
                      {...field}
                      disabled={isSubmitting}
                      aria-invalid={hasSubmitted && !!errors.email}
                    />
                  </FormControl>
                  <FormDescription>
                    Email resmi bisnis untuk komunikasi (opsional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="Contoh: https://hotelbali.com"
                      {...field}
                      disabled={isSubmitting}
                      aria-invalid={hasSubmitted && !!errors.website}
                    />
                  </FormControl>
                  <FormDescription>
                    Website resmi bisnis jika ada (opsional, harus diawali https://)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y"
                      placeholder="Ceritakan tentang bisnis Anda..."
                      {...field}
                      disabled={isSubmitting}
                      aria-invalid={hasSubmitted && !!errors.description}
                    />
                  </FormControl>
                  <FormDescription>
                    Jelaskan tentang bisnis, layanan, atau fasilitas yang Anda tawarkan (opsional, max 2000 karakter)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business License Upload */}
            <div className="space-y-2">
              <Label>Lisensi Bisnis</Label>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="license-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  {licenseFileName || initialData?.business_license_url
                    ? "Ganti File"
                    : "Upload Lisensi"}
                </Label>
                <Input
                  id="license-upload"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/jpg"
                  onChange={handleLicenseChange}
                  className="hidden"
                  disabled={isSubmitting || isUploadingLicense}
                />
                {(licenseFileName || initialData?.business_license_url) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLicenseFile(null)
                      setLicenseFileName(undefined)
                      setLicenseError(null)
                    }}
                    disabled={isSubmitting || isUploadingLicense}
                  >
                    Hapus
                  </Button>
                )}
              </div>
              {isUploadingLicense && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Mengupload lisensi...
                </p>
              )}
              {licenseError && (
                <p className="text-xs text-destructive">{licenseError}</p>
              )}
              {(licenseFileName || initialData?.business_license_url) && (
                <p className="text-sm text-muted-foreground">
                  {licenseFileName || "Lisensi bisnis telah diupload"}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: PDF, JPG, PNG. Maksimal 10MB. Opsional.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  setHasSubmitted(false)
                  setSubmitError(null)
                  setAvatarError(null)
                  setLicenseError(null)
                }}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingAvatar || isUploadingLicense}
              >
                {isSubmitting || isUploadingAvatar || isUploadingLicense
                  ? "Menyimpan..."
                  : mode === "create"
                    ? "Buat Profil"
                    : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
