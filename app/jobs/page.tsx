// Public job marketplace page - accessible without authentication
'use client'

import { useState } from 'react'
import { JobSearch } from '@/components/job-marketplace/JobSearch'
import { JobFilters } from '@/components/job-marketplace/JobFilters'
import { JobSort } from '@/components/job-marketplace/JobSort'
import { JobListWithHeader } from '@/components/job-marketplace/JobList'
import { useJobs } from '@/lib/hooks/useJobs'
import { JobWithRelations, JobFilters as JobFiltersType, JobSortOption } from '@/lib/types/job'
import { Briefcase, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PublicJobsPage() {
  // State for filters and search
  const [search, setSearch] = useState<string>('')
  const [filters, setFilters] = useState<JobFiltersType>({})
  const [sort, setSort] = useState<JobSortOption>('newest')

  // Fetch jobs with filters and sorting
  const { jobs, loading, error, refetch } = useJobs({
    filters: { ...filters, search },
    sort,
    enabled: true,
  })

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  // Handle filters change
  const handleFiltersChange = (newFilters: JobFiltersType) => {
    setFilters(newFilters)
  }

  // Handle sort change
  const handleSortChange = (newSort: JobSortOption) => {
    setSort(newSort)
  }

  // Handle retry on error
  const handleRetry = () => {
    refetch()
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', spaceY: '1.5rem' }}>
        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          <Briefcase style={{ width: '1.5rem', height: '1.5rem', color: '#6b7280' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Job Marketplace
          </h1>
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <p style={{ color: '#991b1b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
              Failed to load jobs: {error.message}
            </p>
            <button
              onClick={handleRetry}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Loader2 style={{ width: '1rem', height: '1rem' }} />
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <Loader2 style={{ width: '2rem', height: '2rem', color: '#2563eb', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#6b7280', margin: 0 }}>Loading jobs...</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr)) 3fr',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            {/* Sidebar - Filters */}
            <aside style={{ gridColumn: '1' }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '1rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                position: 'sticky',
                top: '1rem'
              }}>
                <JobFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              </div>
            </aside>

            {/* Main Column - Search, Sort, and Job List */}
            <div style={{ gridColumn: '2', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Search and Sort Bar */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <JobSearch
                    value={search}
                    onSearchChange={handleSearchChange}
                    placeholder="Search jobs..."
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flexShrink: 0 }}>
                  <JobSort
                    value={sort}
                    onSortChange={handleSortChange}
                  />
                </div>
              </div>

              {/* Job List */}
              <JobListWithHeader
                jobs={jobs}
                loading={loading}
                onJobClick={() => {}}
                title="Available Jobs"
                subtitle={search || Object.keys(filters).length > 0
                  ? 'Filtered results'
                  : 'Browse all jobs'}
                emptyTitle={search || Object.keys(filters).length > 0
                  ? 'No jobs match your criteria'
                  : 'No jobs available'}
                emptyDescription={search || Object.keys(filters).length > 0
                  ? 'Try adjusting your filters'
                  : 'Check back later'}
              />
            </div>
          </div>
        )}
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
