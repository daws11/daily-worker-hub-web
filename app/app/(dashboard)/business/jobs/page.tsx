"use client"

import * as React from "react"
import Link from "next/link"
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

type JobStatus = "draft" | "open" | "in_progress" | "completed"

interface Job {
  id: string
  title: string
  description: string
  status: JobStatus
  createdAt: string
  applicants?: number
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
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // TODO: Replace with actual data fetching from API
  const jobs: Job[] = [
    {
      id: "1",
      title: "Warehouse Worker",
      description: "Looking for reliable warehouse workers for sorting and packaging.",
      status: "draft",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      applicants: 0,
    },
    {
      id: "2",
      title: "Delivery Driver",
      description: "Need experienced delivery drivers for local routes.",
      status: "open",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      applicants: 5,
    },
    {
      id: "3",
      title: "Event Setup Crew",
      description: "Weekend event setup crew needed for upcoming conference.",
      status: "in_progress",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      applicants: 12,
    },
    {
      id: "4",
      title: "Office Cleaning",
      description: "Evening office cleaning staff required.",
      status: "completed",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
      applicants: 8,
    },
  ]

  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === "open" || j.status === "in_progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  }

  const handleCreateJob = async (values: JobPostingFormValues) => {
    setIsSubmitting(true)
    try {
      // TODO: Replace with actual API call to create job
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsDialogOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            <DialogTrigger asChild>
              <Button>
                <BriefcaseIcon className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </DialogTrigger>
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
              {jobs.length === 0
                ? "You haven't posted any jobs yet"
                : `Showing ${jobs.length} job${jobs.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <BriefcaseIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">No jobs posted yet</h3>
                <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                  Get started by creating your first job posting to find workers for your needs.
                </p>
                <DialogTrigger asChild>
                  <Button>
                    <BriefcaseIcon className="mr-2 h-4 w-4" />
                    Create Your First Job
                  </Button>
                </DialogTrigger>
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
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard-business-jobs/${job.id}/edit`}>
                              <PencilIcon className="mr-2 h-3 w-3" />
                              Edit
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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

    {/* Create Job Dialog */}
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Job Posting</DialogTitle>
        <DialogDescription>
          Fill in the details below to post a new job and find workers for your needs.
        </DialogDescription>
      </DialogHeader>
      <JobPostingForm
        onSubmit={handleCreateJob}
        isLoading={isSubmitting}
        submitButtonText="Create Job"
      />
    </DialogContent>
  </Dialog>
  )
}
