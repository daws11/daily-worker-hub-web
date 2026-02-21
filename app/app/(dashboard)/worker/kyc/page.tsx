"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "../../../providers/auth-provider"
import { supabase } from "../../../../lib/supabase/client"
import { validateKTP } from "../../../../lib/utils/ktp-validator"
import { uploadKycDocument } from "../../../../lib/utils/file-upload"
import { submitKycVerification } from "../../../../lib/db/worker-profile"
import { FileUpload, type FileUploadValue } from "../../../../components/worker/file-upload"
import { KycStatusBadge } from "../../../../components/worker/kyc-status-badge"

export default function WorkerKycPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [ktpNumber, setKtpNumber] = useState("")
  const [ktpImage, setKtpImage] = useState<FileUploadValue | null>(null)
  const [selfieImage, setSelfieImage] = useState<FileUploadValue | null>(null)
  const [ktpError, setKtpError] = useState("")
  const [ktpValid, setKtpValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified')
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Load existing KYC status on mount
  useEffect(() => {
    async function loadKycStatus() {
      if (!user) return

      setIsLoadingData(true)

      // Get worker profile
      const { data: workerData } = await supabase
        .from('workers')
        .select('id, kyc_status')
        .eq('user_id', user.id)
        .single()

      if (workerData) {
        setCurrentStatus(workerData.kyc_status || 'unverified')

        // If pending or rejected, get the latest KYC verification details
        if (workerData.kyc_status === 'pending' || workerData.kyc_status === 'rejected') {
          const { data: kycData } = await supabase
            .from('kyc_verifications')
            .select('*')
            .eq('worker_id', workerData.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (kycData) {
            setKtpNumber(kycData.ktp_number || "")
            if (kycData.rejection_reason) {
              setRejectionReason(kycData.rejection_reason)
            }
          }
        }
      }

      setIsLoadingData(false)
    }

    loadKycStatus()
  }, [user])

  // Real-time KTP validation
  const handleKtpNumberChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '')
    setKtpNumber(digitsOnly)

    // Clear validation states when input is empty
    if (digitsOnly.length === 0) {
      setKtpError("")
      setKtpValid(false)
      return
    }

    // Clear error and valid states while typing (less than 16 digits)
    if (digitsOnly.length < 16) {
      setKtpError("")
      setKtpValid(false)
      return
    }

    // Validate when exactly 16 digits
    if (digitsOnly.length === 16) {
      if (validateKTP(digitsOnly)) {
        setKtpError("")
        setKtpValid(true)
      } else {
        setKtpError("Nomor KTP tidak valid. Periksa kembali nomor Anda.")
        setKtpValid(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("Anda harus login untuk submit KYC")
      return
    }

    // Validate KTP number
    if (!ktpValid) {
      if (ktpNumber.length !== 16) {
        setKtpError("Nomor KTP harus 16 digit")
        toast.error("Nomor KTP harus 16 digit")
      } else {
        setKtpError("Nomor KTP tidak valid. Periksa kembali nomor Anda.")
        toast.error("Nomor KTP tidak valid")
      }
      return
    }

    // Validate images
    if (!ktpImage?.file) {
      toast.error("Upload gambar KTP")
      return
    }

    if (!selfieImage?.file) {
      toast.error("Upload selfie")
      return
    }

    setIsLoading(true)

    try {
      // Get worker profile
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (workerError || !workerData) {
        toast.error("Gagal mendapatkan data worker. Silakan lengkapi profil terlebih dahulu.")
        router.push('/worker/profile')
        return
      }

      // Upload KTP image
      let ktpImageUrl = ""
      try {
        ktpImageUrl = await uploadKycDocument(ktpImage.file, user.id, 'ktp')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal upload gambar KTP")
        return
      }

      // Upload selfie image
      let selfieImageUrl = ""
      try {
        selfieImageUrl = await uploadKycDocument(selfieImage.file, user.id, 'selfie')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal upload gambar selfie")
        return
      }

      // Submit KYC verification
      const { error: submitError } = await submitKycVerification({
        workerId: workerData.id,
        ktpNumber: ktpNumber,
        ktpImageUrl,
        selfieImageUrl,
      })

      if (submitError) {
        toast.error("Gagal submit KYC: " + submitError.message)
        return
      }

      toast.success("KYC berhasil dikirim! Tunggu verifikasi admin.")
      setCurrentStatus('pending')
      setRejectionReason(null)
    } catch (error) {
      console.error('Submit error:', error)
      toast.error("Terjadi kesalahan saat submit KYC")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: '#6b7280' }}>Memuat data KYC...</p>
      </div>
    )
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
            Verifikasi KYC
          </h1>
          <KycStatusBadge status={currentStatus} />
        </div>

        {/* Status Banners */}
        {currentStatus === 'verified' && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#065f46' }}>
              ✓ Profil Anda telah terverifikasi
            </p>
          </div>
        )}

        {currentStatus === 'pending' && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#92400e' }}>
              ⏳ KYC Anda sedang dalam proses verifikasi
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#b45309' }}>
              Kami akan menghubungi Anda setelah verifikasi selesai.
            </p>
          </div>
        )}

        {currentStatus === 'rejected' && rejectionReason && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#991b1b' }}>
              ❌ KYC Anda ditolak
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
              Alasan: {rejectionReason}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
              Silakan perbaiki dan submit ulang.
            </p>
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Instructions */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
              <strong>Petunjuk:</strong>
            </p>
            <ul style={{
              margin: '0.5rem 0 0 0',
              paddingLeft: '1.5rem',
              fontSize: '0.875rem',
              color: '#1e40af'
            }}>
              <li>Pastikan KTP terbaca dengan jelas</li>
              <li>Usahakan pencahayaan yang cukup saat foto KTP</li>
              <li>Foto selfie dengan wajah terlihat jelas</li>
              <li>Format file yang diperbolehkan: JPG, PNG, WebP (maks 5MB)</li>
            </ul>
          </div>

          {currentStatus !== 'verified' && currentStatus !== 'pending' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* KTP Number Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Nomor KTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={ktpNumber}
                  onChange={(e) => handleKtpNumberChange(e.target.value)}
                  placeholder="Masukkan 16 digit nomor KTP"
                  maxLength={16}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: ktpError ? '1px solid #ef4444' : ktpValid ? '1px solid #10b981' : '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  required
                />
                {ktpError && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#ef4444' }}>
                    {ktpError}
                  </p>
                )}
                {ktpValid && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>✓</span>
                    <span>Nomor KTP valid</span>
                  </p>
                )}
                {ktpNumber.length > 0 && ktpNumber.length < 16 && !ktpError && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                    {ktpNumber.length}/16 digit
                  </p>
                )}
              </div>

              {/* KTP Image Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Foto KTP
                </label>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Upload foto KTP yang jelas dan terbaca
                </div>
                <div style={{ maxWidth: '500px' }}>
                  <FileUpload
                    value={ktpImage}
                    onChange={setKtpImage}
                    label="Upload Foto KTP"
                    description="JPG, PNG, atau WebP (maks 5MB)"
                    accept=".jpg,.jpeg,.png,.webp"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Selfie Image Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Foto Selfie
                </label>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Upload foto selfie dengan wajah terlihat jelas
                </div>
                <div style={{ maxWidth: '500px' }}>
                  <FileUpload
                    value={selfieImage}
                    onChange={setSelfieImage}
                    label="Upload Foto Selfie"
                    description="JPG, PNG, atau WebP (maks 5MB)"
                    accept=".jpg,.jpeg,.png,.webp"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !ktpValid || !ktpImage?.file || !selfieImage?.file}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: isLoading || !ktpValid || !ktpImage?.file || !selfieImage?.file ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  border: 'none',
                  cursor: isLoading || !ktpValid || !ktpImage?.file || !selfieImage?.file ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}
              >
                {isLoading ? 'Mengirim...' : 'Submit KYC'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {currentStatus === 'verified'
                  ? 'Profil Anda sudah terverifikasi. Hubungi admin jika ada perubahan data.'
                  : 'KYC Anda sedang diproses. Silakan tunggu verifikasi admin.'}
              </p>
            </div>
          )}
        </div>

        {/* Back to Profile Link */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a
            href="/worker/profile"
            style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            ← Kembali ke Profil
          </a>
        </div>
      </div>
    </div>
  )
}
