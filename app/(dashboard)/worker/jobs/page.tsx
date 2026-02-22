"use client"

import { useState, useCallback } from 'react'
import { JobSearch } from '@/components/job-marketplace/JobSearch'
import { JobFilters } from '@/components/job-marketplace/JobFilters'
import { JobSort } from '@/components/job-marketplace/JobSort'
import { JobListWithHeader } from '@/components/job-marketplace/JobList'
import { JobDetailDialog } from '@/components/job-marketplace/JobDetailDialog'
import { useJobs } from '@/lib/hooks/useJobs'
import { JobWithRelations, JobFilters as JobFiltersType, JobSortOption } from '@/lib/types/job'
import { toast } from 'sonner'
import { Briefcase, Loader2 } from 'lucide-react'

export default function WorkerJobsPage() {
  // State for filters and search
  const [search, setSearch] = useState<string>('')
  const [filters, setFilters] = useState<JobFiltersType>({})
  const [sort, setSort] = useState<JobSortOption>('newest')

  // State for job detail dialog
  const [selectedJob, setSelectedJob] = useState<JobWithRelations | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // Fetch jobs with filters and sorting
  const { jobs, loading, error, refetch } = useJobs({
    filters: { ...filters, search },
    sort,
    enabled: true,
  })

  // Handle job click - open detail dialog
  const handleJobClick = useCallback((job: JobWithRelations) => {
    setSelectedJob(job)
    setIsDialogOpen(true)
  }, [])

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false)
    // Delay clearing selected job to allow animation to complete
    setTimeout(() => setSelectedJob(null), 300)
  }, [])

  // Handle job application
  const handleApply = useCallback(async (job: JobWithRelations) => {
    setIsApplying(true)
    try {
      // TODO: Implement actual application logic when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Application submitted successfully!')
      handleDialogClose()
    } catch (err) {
      toast.error('Failed to submit application. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }, [handleDialogClose])

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: JobFiltersType) => {
    setFilters(newFilters)
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((newSort: JobSortOption) => {
    setSort(newSort)
  }, [])

  // Handle retry on error
  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Job Marketplace</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Discover and apply for jobs across Bali
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium mb-2">Failed to load jobs</p>
            <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Try Again
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar - Filters */}
          <aside className="lg:col-span-1">
            <JobFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              className="sticky top-6"
            />
          </aside>

          {/* Main Column - Search, Sort, and Job List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search and Sort Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <JobSearch
                  value={search}
                  onSearchChange={handleSearchChange}
                  placeholder="Search jobs by keyword or position..."
                  className="w-full sm:max-w-md"
                />
              </div>
              <div className="flex-shrink-0">
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
              onJobClick={handleJobClick}
              title="Available Jobs"
              subtitle={search || Object.keys(filters).length > 0
                ? 'Filtered results'
                : 'Browse all open positions'}
              emptyTitle={search || Object.keys(filters).length > 0
                ? 'No jobs match your criteria'
                : 'No jobs available'}
              emptyDescription={search || Object.keys(filters).length > 0
                ? 'Try adjusting your filters or search terms'
                : 'Check back later for new opportunities'}
            />
          </div>
        </div>
      </div>

      {/* Job Detail Dialog */}
      <JobDetailDialog
        job={selectedJob}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onApply={handleApply}
        isApplying={isApplying}
      />
    </div>
  )
}
