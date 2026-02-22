"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "../providers/auth-provider"
import { JobCard } from "@/components/job-card"
import { ApplicationList } from "@/components/application-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Briefcase, UserCheck, Loader2 } from "lucide-react"
import { getJobs } from "@/lib/data/jobs"
import { applyForJob, getWorkerApplications, cancelApplication } from "@/lib/actions/job-applications"
import { supabase } from "@/lib/supabase/client"
import type { JobWithDetails, ApplicationWithDetails } from "@/lib/data/jobs"
import type { Database } from "@/lib/supabase/types"

type WorkersRow = Database["public"]["Tables"]["workers"]["Row"]

export default function WorkerJobsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<JobWithDetails[]>([])
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [worker, setWorker] = useState<WorkersRow | null>(null)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [isApplying, setIsApplying] = useState<Set<string>>(new Set())

  // Fetch worker profile
  useEffect(() => {
    async function fetchWorker() {
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error || !data) {
        toast.error("Profil worker tidak ditemukan")
        return
      }

      setWorker(data)
    }

    fetchWorker()
  }, [user, router])

  // Fetch open jobs
  useEffect(() => {
    async function fetchJobs() {
      setIsLoadingJobs(true)
      try {
        const result = await getJobs({ status: "open" })
        if (result.error) {
          toast.error(result.error)
          return
        }
        setJobs(result.data || [])
      } finally {
        setIsLoadingJobs(false)
      }
    }

    fetchJobs()
  }, [])

  // Fetch worker applications
  useEffect(() => {
    async function fetchApplications() {
      if (!worker) return

      setIsLoadingApplications(true)
      try {
        const result = await getWorkerApplications(worker.id)
        if (result.error) {
          toast.error(result.error)
          return
        }

        const apps = result.data || []
        setApplications(apps)

        // Set applied job IDs for quick lookup
        const appliedIds = new Set(
          apps
            .filter((app) => app.status !== "cancelled")
            .map((app) => app.job_id)
        )
        setAppliedJobIds(appliedIds)
      } finally {
        setIsLoadingApplications(false)
      }
    }

    fetchApplications()
  }, [worker])

  // Handle job application
  const handleApply = async (jobId: string) => {
    if (!worker) {
      toast.error("Profil worker tidak ditemukan")
      return
    }

    // Check if already applied
    if (appliedJobIds.has(jobId)) {
      toast.error("Anda sudah melamar untuk pekerjaan ini")
      return
    }

    setIsApplying((prev) => new Set(prev).add(jobId))

    try {
      const result = await applyForJob(jobId, worker.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Lamaran berhasil dikirim!")

      // Refresh applications to update UI
      const appsResult = await getWorkerApplications(worker.id)
      if (appsResult.success && appsResult.data) {
        setApplications(appsResult.data)
        setAppliedJobIds((prev) => new Set(prev).add(jobId))
      }
    } finally {
      setIsApplying((prev) => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }

  // Handle application cancellation
  const handleCancelApplication = async (applicationId: string) => {
    if (!worker) return

    try {
      const result = await cancelApplication(applicationId, worker.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Lamaran berhasil dibatalkan")

      // Refresh applications to update UI
      const appsResult = await getWorkerApplications(worker.id)
      if (appsResult.success && appsResult.data) {
        const apps = appsResult.data
        setApplications(apps)

        // Update applied job IDs
        const appliedIds = new Set(
          apps
            .filter((app) => app.status !== "cancelled")
            .map((app) => app.job_id)
        )
        setAppliedJobIds(appliedIds)
      }
    } catch (error) {
      toast.error("Gagal membatalkan lamaran")
    }
  }

  // Calculate stats
  const stats = {
    total: jobs.length,
    applied: appliedJobIds.size,
    accepted: applications.filter((a) => a.status === "accepted").length,
    completed: applications.filter((a) => a.status === "completed").length,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard Worker</h1>
          <p className="text-muted-foreground">
            Temukan pekerjaan harian dan kelola lamaran Anda
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Pekerjaan</CardDescription>
              <CardTitle className="text-3xl text-primary">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Tersedia saat ini</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Sudah Melamar</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats.applied}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span>Menunggu respons</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Diterima</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.accepted}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <span>Lamaran disetujui</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Selesai</CardDescription>
              <CardTitle className="text-3xl text-gray-600">{stats.completed}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <span>Pekerjaan selesai</span>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Jobs Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Pekerjaan Tersedia</CardTitle>
                <CardDescription>
                  Temukan pekerjaan yang sesuai dengan keahlian Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingJobs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Belum ada pekerjaan tersedia saat ini
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {jobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onApply={handleApply}
                        isApplied={appliedJobIds.has(job.id)}
                        showApplyButton
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Application History Section */}
          <div className="lg:col-span-1">
            <ApplicationList
              applications={applications}
              onCancel={handleCancelApplication}
              isLoading={isLoadingApplications}
              className="sticky top-6"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
