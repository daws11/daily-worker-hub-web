"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardContent } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"

export default function BusinessOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Step 2: Location
  const [address, setAddress] = useState("")
  const [locationName, setLocationName] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")

  // Step 3: Photos
  const [logoUrl, setLogoUrl] = useState("")
  const [coverUrl, setCoverUrl] = useState("")

  const steps = [
    { id: 1, title: "Info Bisnis", icon: "🏢" },
    { id: 2, title: "Lokasi", icon: "📍" },
    { id: 3, title: "Foto", icon: "📸" },
  ]

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    // Simpan ke database
    setTimeout(() => {
      setIsLoading(false)
      router.push("/business/jobs")
    }, 2000)
  }

  const handleImageUpload = (type: "logo" | "cover") => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        const url = URL.createObjectURL(file)
        type === "logo" ? setLogoUrl(url) : setCoverUrl(url)
      }
    }
    input.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold
                      transition-all duration-300
                      ${step >= s.id
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                        : "bg-slate-200 text-slate-500"
                      }
                    `}
                  >
                    {s.icon}
                  </div>
                  <span className="text-xs font-medium mt-2 text-slate-600">
                    {s.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      h-1 flex-1 mx-2 transition-all duration-300
                      ${step > s.id ? "bg-blue-600" : "bg-slate-200"}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-slate-900">
              {steps[step - 1].title}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              {step === 1 && "Lengkapi informasi bisnis Anda"}
              {step === 2 && "Atur lokasi dan kontak bisnis"}
              {step === 3 && "Upload foto untuk profil bisnis"}
            </p>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-5">
                <Input
                  type="text"
                  label="Nama Bisnis"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Villa Ubud Retreat"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  >
                    <option value="">Pilih kategori...</option>
                    <option value="hotel">Hotel & Villa</option>
                    <option value="restaurant">Restoran & Cafe</option>
                    <option value="resort">Resort</option>
                    <option value="spa">Spa & Wellness</option>
                    <option value="event">Event Organizer</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Deskripsi Bisnis
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ceritakan tentang bisnis Anda..."
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="tel"
                    label="Telepon"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62 812 345 678"
                    required
                  />
                  <Input
                    type="email"
                    label="Email Bisnis"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@bisnis.com"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-5">
                <Input
                  type="text"
                  label="Alamat Lengkap"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Raya Ubud No. 123, Gianyar, Bali"
                  required
                />

                <Input
                  type="text"
                  label="Area"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ubud, Kuta, Seminyak..."
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="text"
                    label="Latitude"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="-8.4095"
                    required
                  />
                  <Input
                    type="text"
                    label="Longitude"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="115.1889"
                    required
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setLat(pos.coords.latitude.toFixed(6))
                          setLng(pos.coords.longitude.toFixed(6))
                        },
                        () => {
                          alert("Gagal mendapatkan lokasi")
                        }
                      )
                    }
                  }}
                >
                  📍 Gunakan Lokasi Saat Ini
                </Button>
              </div>
            )}

            {/* Step 3: Photos */}
            {step === 3 && (
              <div className="space-y-5">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Logo Bisnis
                  </label>
                  <div className="flex justify-center">
                    <div
                      className={`
                        w-32 h-32 rounded-xl flex flex-col items-center justify-center border-4 transition-all duration-200 cursor-pointer
                        ${logoUrl ? "border-blue-500 bg-cover bg-center" : "border-slate-300 bg-slate-100 hover:border-slate-400"}
                      `}
                      style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : {}}
                      onClick={() => handleImageUpload("logo")}
                    >
                      {!logoUrl && (
                        <>
                          <span className="text-4xl mb-2">🏢</span>
                          <span className="text-sm text-slate-600">Upload Logo</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cover Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Foto Cover
                  </label>
                  <div
                    className={`
                      w-full h-48 rounded-xl flex items-center justify-center border-4 transition-all duration-200 cursor-pointer
                      ${coverUrl ? "border-blue-500 bg-cover bg-center" : "border-slate-300 bg-slate-100 hover:border-slate-400"}
                    `}
                    style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : {}}
                    onClick={() => handleImageUpload("cover")}
                  >
                    {!coverUrl && (
                      <div className="text-center">
                        <span className="text-4xl mb-2 block">📸</span>
                        <span className="text-sm text-slate-600">
                          Upload Foto Cover Bisnis
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                  className="flex-1"
                >
                  ← Kembali
                </Button>
              )}
              {step < steps.length ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  className="flex-1"
                >
                  Lanjut →
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  isLoading={isLoading}
                  onClick={handleComplete}
                  className="flex-1"
                >
                  {isLoading ? "Memproses..." : "Selesai & Mulai Posting Job"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
