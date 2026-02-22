"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "../../../lib/supabase/client"
import { useAuth } from "../../providers/auth-provider"
import { KycStatusBadge } from "../../../../components/worker/kyc-status-badge"
import { ReliabilityScoreBreakdown } from "../../../../components/worker/reliability-score"

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
  const { user } = useAuth()
  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [dob, setDob] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [experienceYears, setExperienceYears] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified')
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [reliabilityScore, setReliabilityScore] = useState<number | null>(null)
  const [reliabilityBreakdown, setReliabilityBreakdown] = useState<{
    attendanceRate?: number
    punctualityRate?: number
    averageRating?: number
  } | null>(null)

  // Load existing profile data on mount
  useEffect(() => {
    async function loadProfile() {
      if (!user) return

      setIsLoadingProfile(true)

      try {
        const { data, error } = await supabase
          .from('workers')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist yet, that's okay for new users
            setKycStatus('unverified')
          } else {
            console.error('Error loading profile:', error)
            toast.error("Gagal memuat profil")
          }
          return
        }

      if (data) {
        setFullName(data.full_name || "")
        setGender(data.gender === "male" ? "male" : "female")
        setDob(data.dob || "")
        setPhone(data.phone || "")
        setAddress(data.address || "")
        setExperienceYears(data.experience_years?.toString() || "")
        setKycStatus(data.kyc_status || 'unverified')

        // Set reliability score if available
        if (data.reliability_score !== null && data.reliability_score !== undefined) {
          setReliabilityScore(data.reliability_score)
        }

        // If rejected, load the rejection reason
        if (data.kyc_status === 'rejected') {
          const { data: kycData } = await supabase
            .from('kyc_verifications')
            .select('rejection_reason')
            .eq('worker_id', data.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (kycData?.rejection_reason) {
            setRejectionReason(kycData.rejection_reason)
          }
        } else {
          setRejectionReason(null)
        }
      }

        // Load skills
        const { data: skillsData, error: skillsError } = await supabase
          .from('worker_skills')
          .select('skill_id, skills(name)')
          .eq('worker_id', user.id)

        if (skillsError) {
          console.error('Error loading skills:', skillsError)
          toast.error("Gagal memuat keahlian")
          return
        }

        if (skillsData) {
          const skillNames = skillsData.map((s: any) => s.skills?.name).filter(Boolean)
          setSelectedSkills(skillNames)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error("Gagal memuat data. Silakan refresh halaman.")
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfile()
  }, [user])

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("Anda harus login untuk menyimpan profil")
      return
    }

    setIsLoading(true)

    try {
      // 1. Get or find skill IDs for selected skills
      const { data: existingSkills, error: skillsError } = await supabase
        .from('skills')
        .select('id, name')
        .in('name', selectedSkills)

      if (skillsError) {
        toast.error("Gagal memvalidasi keahlian")
        console.error('Error fetching skills:', skillsError)
        return
      }

      // Create skills that don't exist
      const existingSkillNames = existingSkills?.map(s => s.name) || []
      const newSkillNames = selectedSkills.filter(name => !existingSkillNames.includes(name))

      let createdSkills: any[] = existingSkills || []

      if (newSkillNames.length > 0) {
        const { data: newSkills, error: createSkillsError } = await supabase
          .from('skills')
          .insert(newSkillNames.map(name => ({
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-')
          })))
          .select()

        if (createSkillsError) {
          toast.error("Gagal membuat keahlian baru")
          console.error('Error creating skills:', createSkillsError)
          return
        }

        createdSkills = [...createdSkills, ...(newSkills || [])]
      }

      // 2. Upsert worker profile
      const { error: profileError } = await supabase
        .from('workers')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          gender: gender,
          dob: dob,
          phone: phone,
          address: address,
          experience_years: parseInt(experienceYears) || 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (profileError) {
        toast.error("Gagal menyimpan profil")
        console.error('Error saving profile:', profileError)
        return
      }

      // 3. Get the worker record
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (workerError || !workerData) {
        toast.error("Gagal mendapatkan data worker")
        console.error('Error fetching worker:', workerError)
        return
      }

      // 4. Delete existing worker_skills and insert new ones
      await supabase
        .from('worker_skills')
        .delete()
        .eq('worker_id', workerData.id)

      if (createdSkills.length > 0) {
        const { error: linkError } = await supabase
          .from('worker_skills')
          .insert(createdSkills.map((skill: any) => ({
            worker_id: workerData.id,
            skill_id: skill.id
          })))

        if (linkError) {
          toast.error("Profil tersimpan, tapi keahlian gagal disimpan")
          console.error('Error linking skills:', linkError)
          return
        }
      }

      toast.success("Profil berhasil disimpan!")
    } catch (error) {
      console.error('Submit error:', error)
      toast.error("Terjadi kesalahan saat menyimpan profil")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            Profil Worker
          </h1>
          <KycStatusBadge status={kycStatus} />
        </div>

        {/* Unverified Banner */}
        {kycStatus === 'unverified' && (
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#3b82f6"/>
              <path d="M10 5V10M10 15H10.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#1e40af' }}>
                Verifikasi KYC Belum Dilakukan
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#1e3a8a' }}>
                Lengkapi verifikasi KYC agar profil Anda terverifikasi dan dapat menerima pekerjaan.
              </p>
              <a
                href="/worker/kyc"
                style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                Verifikasi Sekarang
              </a>
            </div>
          </div>
        )}

        {/* Pending Banner */}
        {kycStatus === 'pending' && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#f59e0b"/>
              <path d="M10 6V10L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#92400e' }}>
                KYC Sedang Diproses
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#b45309' }}>
                Verifikasi KYC Anda sedang dalam proses. Kami akan menghubungi Anda setelah selesai.
              </p>
            </div>
          </div>
        )}

        {/* Rejected Banner */}
        {kycStatus === 'rejected' && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#ef4444"/>
              <path d="M6 8L10 12M10 8L6 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#991b1b' }}>
                KYC Ditolak
              </p>
              {rejectionReason && (
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                  Alasan: {rejectionReason}
                </p>
              )}
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                Silakan perbaiki dan submit ulang verifikasi KYC Anda.
              </p>
              <a
                href="/worker/kyc"
                style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                Submit Ulang
              </a>
            </div>
          </div>
        )}

        {/* Verified Banner */}
        {kycStatus === 'verified' && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#10b981"/>
              <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#065f46' }}>
                Profil Terverifikasi
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#047857' }}>
                Profil Anda ditampilkan dalam mode baca saja. Hubungi admin untuk mengubah data.
              </p>
            </div>
          </div>
        )}

        {/* Reliability Score Breakdown */}
        {reliabilityScore !== null && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
              Skor Reliabilitas
            </h3>
            <ReliabilityScoreBreakdown
              score={reliabilityScore}
              breakdown={reliabilityBreakdown || undefined}
              size="md"
            />
          </div>
        )}

        {/* Loading State */}
        {isLoadingProfile ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#6b7280' }}>Memuat profil...</p>
          </div>
        ) : (
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
                readOnly={kycStatus === 'verified'}
                disabled={kycStatus === 'verified'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem',
                  backgroundColor: kycStatus === 'verified' ? '#f3f4f6' : 'white',
                  cursor: kycStatus === 'verified' ? 'not-allowed' : 'auto'
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: kycStatus === 'verified' ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === "male"}
                    onChange={(e) => setGender(e.target.value as "male" | "female")}
                    disabled={kycStatus === 'verified'}
                    style={{ cursor: kycStatus === 'verified' ? 'not-allowed' : 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Laki-laki</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: kycStatus === 'verified' ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === "female"}
                    onChange={(e) => setGender(e.target.value as "male" | "female")}
                    disabled={kycStatus === 'verified'}
                    style={{ cursor: kycStatus === 'verified' ? 'not-allowed' : 'pointer' }}
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
                readOnly={kycStatus === 'verified'}
                disabled={kycStatus === 'verified'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem',
                  backgroundColor: kycStatus === 'verified' ? '#f3f4f6' : 'white',
                  cursor: kycStatus === 'verified' ? 'not-allowed' : 'auto'
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
                readOnly={kycStatus === 'verified'}
                disabled={kycStatus === 'verified'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem',
                  backgroundColor: kycStatus === 'verified' ? '#f3f4f6' : 'white',
                  cursor: kycStatus === 'verified' ? 'not-allowed' : 'auto'
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
                readOnly={kycStatus === 'verified'}
                disabled={kycStatus === 'verified'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem',
                  minHeight: '80px',
                  resize: 'vertical',
                  backgroundColor: kycStatus === 'verified' ? '#f3f4f6' : 'white',
                  cursor: kycStatus === 'verified' ? 'not-allowed' : 'auto'
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
                readOnly={kycStatus === 'verified'}
                disabled={kycStatus === 'verified'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  fontSize: '0.875rem',
                  backgroundColor: kycStatus === 'verified' ? '#f3f4f6' : 'white',
                  cursor: kycStatus === 'verified' ? 'not-allowed' : 'auto'
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
                      cursor: kycStatus === 'verified' ? 'not-allowed' : 'pointer',
                      backgroundColor: selectedSkills.includes(skill) ? '#eff6ff' : 'white',
                      fontSize: '0.875rem',
                      opacity: kycStatus === 'verified' ? '0.7' : '1'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => handleSkillToggle(skill)}
                      disabled={kycStatus === 'verified'}
                      style={{ cursor: kycStatus === 'verified' ? 'not-allowed' : 'pointer' }}
                    />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button - Hide when verified */}
            {kycStatus !== 'verified' && (
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
            )}
          </form>
          </div>
        )}
      </div>
    </div>
  )
}
