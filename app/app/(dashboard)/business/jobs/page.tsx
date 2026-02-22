"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BriefcaseIcon, CheckCircle2Icon, ClockIcon } from "lucide-react"

export default function BusinessJobsPage() {
  // TODO: Replace with actual data fetching from API
  const jobs = []
  const stats = {
    total: 0,
    active: 0,
    completed: 0,
  }

  return (
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
          <Button asChild>
            <Link href="/dashboard-business-jobs/create">
              <BriefcaseIcon className="mr-2 h-4 w-4" />
              Create Job
            </Link>
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
                <Button asChild>
                  <Link href="/dashboard-business-jobs/create">
                    <BriefcaseIcon className="mr-2 h-4 w-4" />
                    Create Your First Job
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Job items will be rendered here when data is available */}
                {jobs.map((job) => (
                  <div key={job.id}>
                    {/* Job item implementation */}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
