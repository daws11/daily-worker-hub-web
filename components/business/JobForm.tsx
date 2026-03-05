"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useTranslation } from '@/lib/i18n/hooks'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  MapPin, 
  Clock,
  DollarSign,
  AlertCircle
} from 'lucide-react'

interface JobFormData {
  title: string
  description: string
  requirements: string
  category_id: string
  budget_min: string
  budget_max: string
  hours_needed: string
  address: string
  deadline: string
  is_urgent: boolean
}

interface Category {
  id: string
  name: string
  slug: string
}

interface BusinessProfile {
  id: string
  name: string
  address?: string
  lat?: number
  lng?: number
}

export default function JobForm() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [business, setBusiness] = useState<BusinessProfile | null>(null)

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    requirements: '',
    category_id: '',
    budget_min: '',
    budget_max: '',
    hours_needed: '4',
    address: '',
    deadline: '',
    is_urgent: false
  })

  // Fetch categories and business profile on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setInitialLoading(true)

        // Fetch categories
        const catsRes = await fetch('/api/categories')
        const catsData = await catsRes.json()
        console.log('Categories response:', catsData)
        if (catsData?.data) {
          setCategories(catsData.data)
        }

        // Fetch business profile
        const bizRes = await fetch('/api/business/profile')
        const bizData = await bizRes.json()
        console.log('Business response:', bizData)
        if (bizData?.data) {
          setBusiness(bizData.data)
          // Pre-fill address if available
          if (bizData.data.address) {
            setFormData(prev => ({
              ...prev,
              address: bizData.data.address || ''
            }))
          }
        }
      } catch (err) {
        console.error('Error fetching initial data:', err)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Job title is required')
      return false
    }

    if (!formData.description.trim()) {
      setError('Job description is required')
      return false
    }

    if (!formData.category_id) {
      setError('Please select a category')
      return false
    }

    const minBudget = parseFloat(formData.budget_min)
    const maxBudget = parseFloat(formData.budget_max)

    if (isNaN(minBudget) || minBudget < 0) {
      setError('Minimum budget must be a valid positive number')
      return false
    }

    if (isNaN(maxBudget) || maxBudget < 0) {
      setError('Maximum budget must be a valid positive number')
      return false
    }

    if (maxBudget < minBudget) {
      setError('Maximum budget must be greater than or equal to minimum budget')
      return false
    }

    const hoursNeeded = parseInt(formData.hours_needed)
    if (isNaN(hoursNeeded) || hoursNeeded < 4 || hoursNeeded > 12) {
      setError('Hours needed must be between 4 and 12')
      return false
    }

    if (!formData.address.trim()) {
      setError('Job address is required')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    if (!business) {
      setError('Business profile not found. Please complete your business profile first.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          category_id: formData.category_id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          requirements: formData.requirements.trim(),
          budget_min: parseFloat(formData.budget_min),
          budget_max: parseFloat(formData.budget_max),
          hours_needed: parseInt(formData.hours_needed),
          address: formData.address.trim(),
          deadline: formData.deadline || null,
          is_urgent: formData.is_urgent,
          overtime_multiplier: 1.0
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create job')
      }

      const { data } = await response.json()

      toast.success('Job created successfully!')

      // Redirect to jobs list
      router.push('/business/jobs')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            Back
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Create New Job
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
            <p style={{ color: '#991b1b', margin: 0, fontSize: '0.875rem' }}>
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem'
          }}
        >
          {/* Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
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
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                disabled: loading ? { backgroundColor: '#f3f4f6' } : {}
              }}
            />
          </div>

          {/* Category */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Category *
            </label>
            {initialLoading ? (
              <div style={{
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div style={{
                padding: '0.625rem',
                border: '1px solid #fecaca',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#dc2626',
                backgroundColor: '#fef2f2'
              }}>
                No categories available. Please contact admin.
              </div>
            ) : (
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
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
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Requirements */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Requirements
            </label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              placeholder="List any specific skills or experience required..."
              disabled={loading}
              rows={3}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Budget Range */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DollarSign style={{ width: '1rem', height: '1rem' }} />
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
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DollarSign style={{ width: '1rem', height: '1rem' }} />
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
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* Hours Needed */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock style={{ width: '1rem', height: '1rem' }} />
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
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Minimum 4 hours, maximum 12 hours
            </p>
          </div>

          {/* Address */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin style={{ width: '1rem', height: '1rem' }} />
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
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Deadline (Optional)
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Is Urgent */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                name="is_urgent"
                checked={formData.is_urgent}
                onChange={handleChange}
                disabled={loading}
                style={{
                  width: '1.125rem',
                  height: '1.125rem',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                Mark this job as urgent
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                disabled: loading ? { opacity: 0.5, cursor: 'not-allowed' } : {}
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                disabled: loading ? { opacity: 0.5, cursor: 'not-allowed' } : {}
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                  Creating...
                </>
              ) : (
                <>
                  <Save style={{ width: '1rem', height: '1rem' }} />
                  Create Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
