"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardContent } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"

export default function WorkerOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Step 1: Profile
  const [fullName, setFullName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  // Step 2: Skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  // Step 3: Location
  const [locationName, setLocationName] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")

  // Step 4: Availability
  const [availability, setAvailability] = useState("full-time")

  const steps = [
    { id: 1, title: "Profil", icon: "👤" },
    { id: 2, title: "Keahlian", icon: "⚡" },
    { id: 3, title: "Lokasi", icon: "📍" },
    { id: 4, title: "Ketersediaan", icon: "📅" },
  ]

  const handleNext = async () => {
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
      router.push("/worker/jobs")
    }, 2000)
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
              {step === 1 && "Buat profil yang menonjolkan keahlianmu"}
              {step === 2 && "Pilih kategori pekerjaan yang kamu kuasai"}
              {step === 3 && "Atur lokasi kerja yang kamu inginkan"}
              {step === 4 && "Tentukan jadwal ketersediaan kerjamu"}
            </p>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Step 1: Profile */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Avatar Upload */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div
                      className={`
                        w-24 h-24 rounded-full flex items-center justify-center text-4xl
                        border-4 transition-all duration-200
                        ${avatarUrl ? "border-blue-500 bg-cover bg-center" : "border-slate-300 bg-slate-100"}
                        hover:border-blue-400 cursor-pointer
                      `}
                      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}}
                      onClick={() => {
                        // Trigger file upload
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.onchange = (e: any) => {
                          const file = e.target.files[0]
                          if (file) {
                            setAvatarUrl(URL.createObjectURL(file))
                          }
                        }
                        input.click()
                      }}
                    >
                      {!avatarUrl && "📷"}
                    </div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-blue-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <Input
                  type="text"
                  label="Nama Lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Budi Santoso"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Bio Singkat
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Ceritakan tentang dirimu dan pengalaman kerjamu..."
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Skills */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "driver", label: "Driver", icon: "🚗" },
                    { id: "cleaner", label: "Cleaner", icon: "🧹" },
                    { id: "cook", label: "Cook", icon: "👨‍🍳" },
                    { id: "steward", label: "Steward", icon: "🍽️" },
                    { id: "waiter", label: "Waiter", icon: "🍽️" },
                    { id: "receptionist", label: "Receptionist", icon: "🏢" },
                  ].map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => {
                        setSelectedSkills(prev =>
                          prev.includes(skill.id)
                            ? prev.filter(s => s !== skill.id)
                            : [...prev, skill.id]
                        )
                      }}
                      className={`
                        flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                        ${selectedSkills.includes(skill.id)
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }
                      `}
                    >
                      <span className="text-2xl">{skill.icon}</span>
                      <span className="text-sm font-medium text-slate-700">
                        {skill.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {step === 3 && (
              <div className="space-y-5">
                <Input
                  type="text"
                  label="Area Kerja"
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
                    // Get current location
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

            {/* Step 4: Availability */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  {[
                    { id: "full-time", label: "Full-time", desc: "Senin - Jumat, 8 jam/hari" },
                    { id: "part-time", label: "Part-time", desc: "Fleksibel, sesuai kebutuhan" },
                    { id: "flexible", label: "Fleksibel", desc: "Sesuai jadwal yang tersedia" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAvailability(opt.id)}
                      className={`
                        w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                        ${availability === opt.id
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }
                      `}
                    >
                      <span className="text-sm font-semibold text-slate-900">
                        {opt.label}
                      </span>
                      <p className="text-xs text-slate-600 mt-1">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
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
                  {isLoading ? "Memproses..." : "Selesai & Mulai Cari Kerja"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
