"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
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
  businessProfileSchema,
  type BusinessProfileInput,
  type BusinessType,
  type Area,
} from "@/lib/schemas/business"

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

  const form = useForm<BusinessProfileInput>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: initialData || {
      name: "",
      business_type: "hotel",
      address: "",
      area: "Badung",
      phone: "",
      email: "",
      website: "",
      description: "",
    },
  })

  const handleSubmit = async (data: BusinessProfileInput) => {
    setIsSubmitting(true)

    try {
      if (onSubmit) {
        const result = await onSubmit(data)
        if (result.error) {
          toast.error(result.error)
          return
        }
      }

      toast.success(
        mode === "create"
          ? "Profil bisnis berhasil dibuat"
          : "Profil bisnis berhasil diperbarui"
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan"
      )
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
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
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
                    />
                  </FormControl>
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
                  >
                    <FormControl>
                      <SelectTrigger>
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
                    />
                  </FormControl>
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
                  >
                    <FormControl>
                      <SelectTrigger>
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
                    />
                  </FormControl>
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
                    />
                  </FormControl>
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
                    />
                  </FormControl>
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
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
