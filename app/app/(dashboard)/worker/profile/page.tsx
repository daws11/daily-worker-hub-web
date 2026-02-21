"use client"

import { useState } from "react"

const AVAILABLE_SKILLS = [
  "Kebersihan Rumah",
  "Laundry & Setrika",
  "Memasak",
  "Merapikan Rumah",
  "Cuci Piring",
  "Jaga Anak",
  "Jaga Lansia",
  "Belanja Pasar",
  "Pekerjaan Luar Rumah"
]

export default function WorkerProfilePage() {
  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [dob, setDob] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [experienceYears, setExperienceYears] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsLoading(false)
    setShowToast(true)

    // Hide toast after 3 seconds
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Profil Worker
        </h1>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Nama Lengkap
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                placeholder="Budi Santoso"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Jenis Kelamin
              </label>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === "male"}
                    onChange={(e) => setGender(e.target.value as "male" | "female")}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Laki-laki</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === "female"}
                    onChange={(e) => setGender(e.target.value as "male" | "female")}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Perempuan</span>
                </label>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Nomor Telepon
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                placeholder="081234567890"
                required
              />
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Alamat
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Jl. Contoh No. 123, Jakarta"
                required
              />
            </div>

            {/* Experience Years */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Pengalaman (Tahun)
              </label>
              <input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                placeholder="0"
                min="0"
                required
              />
            </div>

            {/* Skills */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Keahlian
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.5rem'
              }}>
                {AVAILABLE_SKILLS.map(skill => (
                  <label
                    key={skill}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      border: `1px solid ${selectedSkills.includes(skill) ? '#2563eb' : '#d1d5db'}`,
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      backgroundColor: selectedSkills.includes(skill) ? '#eff6ff' : 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => handleSkillToggle(skill)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
                color: 'white',
                borderRadius: '0.375rem',
                fontWeight: 500,
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                marginTop: '0.5rem'
              }}
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </form>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          fontSize: '0.875rem',
          zIndex: 1000
        }}>
          ✓ Profil berhasil disimpan!
        </div>
      )}
    </div>
  )
}
