"use client"

import { useState, useCallback, useMemo } from 'react'
import { JobSearch } from '@/components/job-marketplace/JobSearch'
import { JobFilters } from '@/components/job-marketplace/JobFilters'
import { JobSort } from '@/components/job-marketplace/JobSort'
import { JobListWithHeader } from '@/components/job-marketplace/JobList'
import { JobDetailDialog } from '@/components/job-marketplace/JobDetailDialog'
import { useJobs } from '@/lib/hooks/useJobs'
import { JobWithRelations, JobFilters as JobFiltersType, JobSortOption } from '@/lib/types/job'
import { toast } from 'sonner'
import { Briefcase, Loader2, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function WorkerJobsPage() {
  // State for filters and search
  const [search, setSearch] = useState<string>('')
  const [filters, setFilters] = useState<JobFiltersType>({})
  const [sort, setSort] = useState<JobSortOption>('newest')

  // State for job detail dialog
  const [selectedJob, setSelectedJob] = useState<JobWithRelations | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // State for mobile filters dialog
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  // Fetch jobs with filters and sorting
  const { jobs, loading, error, refetch } = useJobs({
    filters: { ...filters, search },
    sort,
    enabled: true,
  })

  // Calculate active filters count for badge
  const activeFiltersCount = useMemo(() => {
    return Object.keys(filters).filter(
      (key) => filters[key as keyof JobFiltersType] !== undefined && filters[key as keyof JobFiltersType] !== ''
    ).length
  }, [filters])

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
    <div className="min-h-screen bg-muted/30 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            <h1 className="text-xl font-bold sm:text-2xl">Job Marketplace</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Discover and apply for jobs across Bali
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 sm:p-6 text-center">
            <p className="text-destructive font-medium mb-2 text-sm sm:text-base">Failed to load jobs</p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">{error.message}</p>
            <Button
              onClick={handleRetry}
              variant="default"
              size="sm"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Try Again
            </Button>
          </div>
        )}

        {/* Search and Filter Bar - Mobile First */}
        <div className="space-y-3">
          {/* Search Bar - Full width on mobile */}
          <div className="w-full">
            <JobSearch
              value={search}
              onSearchChange={handleSearchChange}
              placeholder="Search jobs by keyword or position..."
              className="w-full"
            />
          </div>

          {/* Filter and Sort Actions Bar */}
          <div className="flex items-center justify-between gap-2">
            {/* Mobile Filters Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {/* Sort - Full width on mobile, compact on larger screens */}
            <div className="flex-1 lg:flex-none">
              <JobSort
                value={sort}
                onSortChange={handleSortChange}
                className="w-full lg:w-auto"
              />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar - Filters - Hidden on mobile, visible on lg+ */}
          <aside className="hidden lg:block lg:col-span-1">
            <JobFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              className="sticky top-6"
            />
          </aside>

          {/* Main Column - Job List */}
          <div className="lg:col-span-1">
            <JobListWithHeader
              jobs={jobs}
              loading={loading}
              onJobClick={handleJobClick}
              title="Available Jobs"
              subtitle={search || activeFiltersCount > 0
                ? 'Filtered results'
                : 'Browse all open positions'}
              emptyTitle={search || activeFiltersCount > 0
                ? 'No jobs match your criteria'
                : 'No jobs available'}
              emptyDescription={search || activeFiltersCount > 0
                ? 'Try adjusting your filters or search terms'
                : 'Check back later for new opportunities'}
            />
          </div>
        </div>
      </div>

      {/* Mobile Filters Dialog */}
      <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Filters
              </DialogTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">
                  {activeFiltersCount} {activeFiltersCount === 1 ? 'filter' : 'filters'} applied
                </Badge>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)] px-4 sm:px-6 py-4">
            <JobFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              className="border-0 shadow-none"
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
