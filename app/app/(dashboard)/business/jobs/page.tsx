"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { JobPostingForm, type JobPostingFormValues } from "@/app/components/job-posting-form"
import { createJob, updateJob, publishJob, deleteJob, getBusinessJobs } from "@/lib/supabase/queries/jobs"
import { useAuth } from "@/app/providers/auth-provider"

type JobStatus = "draft" | "open" | "in_progress" | "completed"

interface Job {
  id: string
  title: string
  description: string
  status: JobStatus
  createdAt: string
  applicants?: number
  positionType?: JobPostingFormValues["positionType"]
  date?: string
  startTime?: string
  endTime?: string
  area?: string
  address?: string
  wageMin?: number
  wageMax?: number
  workersNeeded?: number
  requirements?: string[]
}

function getStatusBadgeVariant(status: JobStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "draft":
      return "secondary"
    case "open":
      return "default"
    case "in_progress":
      return "outline"
    case "completed":
      return "secondary"
  }
}

function getStatusLabel(status: JobStatus): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "open":
      return "Open"
    case "in_progress":
      return "In Progress"
    case "completed":
      return "Completed"
  }
}

export default function BusinessJobsPage() {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [editingJob, setEditingJob] = React.useState<Job | null>(null)
  const [jobToDelete, setJobToDelete] = React.useState<Job | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isLoadingJobs, setIsLoadingJobs] = React.useState(true)
  const [jobs, setJobs] = React.useState<Job[]>([])

  // Load jobs from database on mount
  React.useEffect(() => {
    const loadJobs = async () => {
      if (!user?.id) {
        setIsLoadingJobs(false)
        return
      }
      try {
        const jobsData = await getBusinessJobs(user.id)
        // Transform database rows to Job interface format
        const transformedJobs: Job[] = jobsData.map((job) => ({
          id: job.id,
          title: job.title,
          description: job.description,
          status: job.status as JobStatus,
          createdAt: job.created_at,
          applicants: 0, // TODO: Fetch from bookings table
          positionType: (job as any).position_type, // Load position_type from database
          date: job.deadline,
          address: job.address,
          wageMin: job.budget_min,
          wageMax: job.budget_max,
        }))
        setJobs(transformedJobs)
      } catch (error) {
        console.error('Failed to load jobs:', error)
        toast.error('Gagal memuat lowongan')
      } finally {
        setIsLoadingJobs(false)
      }
    }
    loadJobs()
  }, [user?.id])

  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === "open" || j.status === "in_progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  }

  const handleOpenCreateDialog = () => {
    setEditingJob(null)
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (job: Job) => {
    setEditingJob(job)
    setIsDialogOpen(true)
  }

  const handleJobSubmit = async (values: JobPostingFormValues) => {
    if (!user?.id) {
      toast.error("User tidak terautentikasi")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingJob) {
        // Update existing job
        await updateJob(editingJob.id, {
          title: values.title,
          description: values.description,
          deadline: values.date,
          address: values.address,
          budget_min: values.wageMin,
          budget_max: values.wageMax,
        })

        setJobs((prev) =>
          prev.map((job) =>
            job.id === editingJob.id
              ? {
                  ...job,
                  title: values.title,
                  description: values.description,
                  positionType: values.positionType,
                  date: values.date,
                  startTime: values.startTime,
                  endTime: values.endTime,
                  area: values.area,
                  address: values.address,
                  wageMin: values.wageMin,
                  wageMax: values.wageMax,
                  workersNeeded: values.workersNeeded,
                  requirements: values.requirements,
                }
              : job
          )
        )

        toast.success("Lowongan berhasil diperbarui")
      } else {
        // Create new job
        const newJob = await createJob({
          business_id: user.id,
          category_id: null,
          position_type: values.positionType,
          title: values.title,
          description: values.description,
          requirements: values.requirements.join(','),
          budget_min: values.wageMin,
          budget_max: values.wageMax,
          status: "draft",
          deadline: values.date,
          address: values.address,
          lat: -8.4, // Bali center latitude (default until geocoding is implemented)
          lng: 115.1, // Bali center longitude (default until geocoding is implemented)
        })

        setJobs((prev) => [{
          id: newJob.id,
          title: newJob.title,
          description: newJob.description,
          status: newJob.status as JobStatus,
          createdAt: newJob.created_at,
          applicants: 0,
          positionType: values.positionType,
          date: values.date,
          startTime: values.startTime,
          endTime: values.endTime,
          area: values.area,
          address: newJob.address,
          wageMin: newJob.budget_min,
          wageMax: newJob.budget_max,
          workersNeeded: values.workersNeeded,
          requirements: values.requirements,
        }, ...prev])

        toast.success("Lowongan berhasil dibuat")
      }
      setIsDialogOpen(false)
      setEditingJob(null)
    } catch (error) {
      console.error('Job submit error:', error)
      toast.error(editingJob ? "Gagal memperbarui lowongan" : "Gagal membuat lowongan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDialogDefaultValues = (): Partial<JobPostingFormValues> | undefined => {
    if (!editingJob) return undefined
    return {
      title: editingJob.title,
      description: editingJob.description,
      positionType: editingJob.positionType,
      date: editingJob.date || "",
      startTime: editingJob.startTime || "",
      endTime: editingJob.endTime || "",
      area: editingJob.area || "",
      address: editingJob.address || "",
      wageMin: editingJob.wageMin || 0,
      wageMax: editingJob.wageMax || 0,
      workersNeeded: editingJob.workersNeeded || 1,
      requirements: editingJob.requirements || [],
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingJob(null)
    }
  }

  const handlePublishJob = async (job: Job) => {
    try {
      await publishJob(job.id)

      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: "open" as JobStatus } : j
        )
      )

      toast.success("Lowongan berhasil dipublikasikan")
    } catch (error) {
      console.error('Publish job error:', error)
      toast.error("Gagal mempublikasikan lowongan")
    }
  }

  const handleDeleteClick = (job: Job) => {
    setJobToDelete(job)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return

    try {
      await deleteJob(jobToDelete.id)

      setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id))
      setIsDeleteDialogOpen(false)
      setJobToDelete(null)

      toast.success("Lowongan berhasil dihapus")
    } catch (error) {
      console.error('Delete job error:', error)
      toast.error("Gagal menghapus lowongan")
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setJobToDelete(null)
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <div className="min-h-screen bg-muted/40 p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Jobs</h1>
              <p className="text-muted-foreground">
                Manage your job postings and track applications
              </p>
            </div>
            <Button onClick={handleOpenCreateDialog}>
              <BriefcaseIcon className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All job postings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                Currently accepting applications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Finished hiring
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Job Listings */}
        <Card>
          <CardHeader>
            <CardTitle>Job Listings</CardTitle>
            <CardDescription>
              {isLoadingJobs
                ? "Loading jobs..."
                : jobs.length === 0
                ? "You haven't posted any jobs yet"
                : `Showing ${jobs.length} job${jobs.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingJobs ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <BriefcaseIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">No jobs posted yet</h3>
                <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                  Get started by creating your first job posting to find workers for your needs.
                </p>
                <Button onClick={handleOpenCreateDialog}>
                  <BriefcaseIcon className="mr-2 h-4 w-4" />
                  Create Your First Job
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{job.title}</h3>
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {getStatusLabel(job.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                        {job.status !== "draft" && (
                          <span>{job.applicants} applicant{job.applicants !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 md:flex-col md:gap-1">
                      {job.status === "draft" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(job)}
                          >
                            <PencilIcon className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePublishJob(job)}
                          >
                            Publish
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(job)}
                          >
                            <Trash2Icon className="mr-2 h-3 w-3" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard-business-jobs/${job.id}`}>
                            <EyeIcon className="mr-2 h-3 w-3" />
                            View
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Create/Edit Job Dialog */}
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editingJob ? "Edit Job Posting" : "Create New Job Posting"}</DialogTitle>
        <DialogDescription>
          {editingJob
            ? "Update the job details below. Changes will be saved immediately."
            : "Fill in the details below to post a new job and find workers for your needs."}
        </DialogDescription>
      </DialogHeader>
      <JobPostingForm
        onSubmit={handleJobSubmit}
        defaultValues={getDialogDefaultValues()}
        isLoading={isSubmitting}
        submitButtonText={editingJob ? "Update Job" : "Create Job"}
      />
    </DialogContent>
  </Dialog>

  {/* Delete Confirmation Dialog */}
  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Job Posting</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={handleDeleteCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDeleteConfirm}>
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  )
}
