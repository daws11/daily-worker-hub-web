"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ApplicantList } from "@/components/applicant-list"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { acceptApplication, rejectApplication } from "@/lib/actions/job-applications"
import { checkComplianceBeforeAccept } from "@/lib/actions/compliance"
import { Briefcase, Calendar, MapPin, Wallet, Building2, Users, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import type { ApplicantWithDetails } from "@/lib/data/jobs"
import type { ComplianceStatusResult } from "@/lib/supabase/queries/compliance"

type BusinessesRow = Database["public"]["Tables"]["businesses"]["Row"]
type Job = Database["public"]["Tables"]["jobs"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

type JobWithApplicantCount = Job & {
  applicant_count: number
}

type ApplicantWithJobId = ApplicantWithDetails & { job_id: string }

export default function BusinessJobsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [business, setBusiness] = useState<BusinessesRow | null>(null)
  const [jobs, setJobs] = useState<JobWithApplicantCount[]>([])
  const [applicantsByJob, setApplicantsByJob] = useState<Record<string, ApplicantWithDetails[]>>({})
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [isLoadingApplicants, setIsLoadingApplicants] = useState<Record<string, boolean>>({})
  const [complianceStatusByApplicant, setComplianceStatusByApplicant] = useState<Record<string, ComplianceStatusResult>>({})
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({})
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({})

  // Fetch business profile
  useEffect(() => {
    async function fetchBusiness() {
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error || !data) {
        toast.error("Profil bisnis tidak ditemukan")
        return
      }

      setBusiness(data)
    }

    fetchBusiness()
  }, [user, router])

  // Fetch business jobs with applicant count
  useEffect(() => {
    async function fetchJobs() {
      if (!business) return

      setIsLoadingJobs(true)
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(`
            *,
            bookings (id)
          `)
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })

        if (error) {
          toast.error("Gagal memuat data pekerjaan")
          return
        }

        // Transform data to include applicant count
        const jobsWithCount = (data as Job[]).map((job) => ({
          ...job,
          applicant_count: (job as any).bookings?.length || 0,
        }))

        setJobs(jobsWithCount)
      } finally {
        setIsLoadingJobs(false)
      }
    }

    fetchJobs()
  }, [business])

  // Fetch applicants for a specific job
  const fetchApplicants = async (jobId: string) => {
    if (!business) return

    setIsLoadingApplicants((prev) => ({ ...prev, [jobId]: true }))
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          workers (
            id,
            full_name,
            phone,
            bio,
            avatar_url
          )
        `)
        .eq("job_id", jobId)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })

      if (error) {
        toast.error("Gagal memuat data pelamar")
        return
      }

      const applicants = data as ApplicantWithDetails[]

      setApplicantsByJob((prev) => ({
        ...prev,
        [jobId]: applicants,
      }))

      // Fetch compliance status for each applicant
      for (const applicant of applicants) {
        try {
          const result = await checkComplianceBeforeAccept(
            applicant.workers.id,
            business.id
          )

          if (result.success && result.data) {
            setComplianceStatusByApplicant((prev) => ({
              ...prev,
              [applicant.id]: result.data,
            }))
          }
        } catch {
          // Silently fail for compliance check errors
        }
      }
    } finally {
      setIsLoadingApplicants((prev) => ({ ...prev, [jobId]: false }))
    }
  }

  // Toggle job expansion
  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs((prev) => {
      const newState = { ...prev, [jobId]: !prev[jobId] }
      // If expanding and haven't loaded applicants yet, fetch them
      if (newState[jobId] && !applicantsByJob[jobId]) {
        fetchApplicants(jobId)
      }
      return newState
    })
  }

  // Handle accept applicant
  const handleAcceptApplicant = async (applicantId: string) => {
    if (!business) return

    // Find the job_id for this applicant
    const jobEntry = Object.entries(applicantsByJob).find(([_, applicants]) =>
      applicants.some((a) => a.id === applicantId)
    )

    if (!jobEntry) return

    const [jobId] = jobEntry

    setIsProcessing((prev) => ({ ...prev, [applicantId]: true }))
    try {
      const result = await acceptApplication(applicantId, business.id)

      if (!result.success) {
        toast.error(result.error || "Gagal menerima pelamar")
        return
      }

      toast.success("Pelamar berhasil diterima")

      // Update local state
      setApplicantsByJob((prev) => ({
        ...prev,
        [jobId]: prev[jobId]?.map((app) =>
          app.id === applicantId
            ? { ...app, status: "accepted" as const }
            : app
        ) || [],
      }))
    } finally {
      setIsProcessing((prev) => ({ ...prev, [applicantId]: false }))
    }
  }

  // Handle reject applicant
  const handleRejectApplicant = async (applicantId: string) => {
    if (!business) return

    // Find the job_id for this applicant
    const jobEntry = Object.entries(applicantsByJob).find(([_, applicants]) =>
      applicants.some((a) => a.id === applicantId)
    )

    if (!jobEntry) return

    const [jobId] = jobEntry

    setIsProcessing((prev) => ({ ...prev, [applicantId]: true }))
    try {
      const result = await rejectApplication(applicantId, business.id)

      if (!result.success) {
        toast.error(result.error || "Gagal menolak pelamar")
        return
      }

      toast.success("Pelamar berhasil ditolak")

      // Update local state
      setApplicantsByJob((prev) => ({
        ...prev,
        [jobId]: prev[jobId]?.map((app) =>
          app.id === applicantId
            ? { ...app, status: "rejected" as const }
            : app
        ) || [],
      }))
    } finally {
      setIsProcessing((prev) => ({ ...prev, [applicantId]: false }))
    }
  }

  // Format date to Indonesian locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // Format budget to Indonesian Rupiah
  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get status badge variant
  const getStatusVariant = (
    status: Job["status"]
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "open":
        return "default"
      case "in_progress":
        return "secondary"
      case "closed":
        return "outline"
      default:
        return "outline"
    }
  }

  // Get status label in Indonesian
  const getStatusLabel = (status: Job["status"]): string => {
    switch (status) {
      case "open":
        return "Buka"
      case "in_progress":
        return "Sedang Berjalan"
      case "closed":
        return "Tutup"
      default:
        return status
    }
  }

  // Calculate stats
  const stats = {
    total: jobs.length,
    open: jobs.filter((j) => j.status === "open").length,
    inProgress: jobs.filter((j) => j.status === "in_progress").length,
    closed: jobs.filter((j) => j.status === "closed").length,
    totalApplicants: jobs.reduce((sum, job) => sum + job.applicant_count, 0),
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard Business - Jobs</h1>
          <p className="text-[#666]">
            Kelola pekerjaan dan pelamar Anda
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Pekerjaan</CardDescription>
              <CardTitle className="text-3xl text-[#2563eb]">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Semua pekerjaan</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pekerjaan Buka</CardDescription>
              <CardTitle className="text-3xl text-[#10b981]">{stats.open}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <span>Terbuka untuk pelamar</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Sedang Berjalan</CardDescription>
              <CardTitle className="text-3xl text-[#f59e0b]">{stats.inProgress}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <span>Pekerjaan aktif</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Pelamar</CardDescription>
              <CardTitle className="text-3xl text-[#8b5cf6]">{stats.totalApplicants}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Semua pelamar</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs List */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pekerjaan</CardTitle>
            <CardDescription>
              Kelola pekerjaan dan lihat pelamar ({jobs.length} pekerjaan)
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
                  Belum ada pekerjaan. Buat pekerjaan pertama Anda sekarang!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border rounded-lg overflow-hidden">
                    {/* Job Header */}
                    <div className="p-4 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{job.title}</h3>
                            <Badge variant={getStatusVariant(job.status)}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </div>

                          {job.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {job.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4" />
                              <span>
                                {formatBudget(job.budget_min)}
                                {job.budget_max > job.budget_min &&
                                  ` - ${formatBudget(job.budget_max)}`}
                              </span>
                            </div>

                            {job.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="line-clamp-1">{job.address}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(job.deadline)}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{job.applicant_count} pelamar</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleJobExpansion(job.id)}
                          className="shrink-0"
                        >
                          {expandedJobs[job.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="ml-1">
                            {expandedJobs[job.id] ? "Tutup" : "Lihat Pelamar"}
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* Applicants Section (Collapsible) */}
                    {expandedJobs[job.id] && (
                      <div className="border-t p-4 bg-gray-50">
                        <ApplicantList
                          applicants={applicantsByJob[job.id] || []}
                          onAccept={handleAcceptApplicant}
                          onReject={handleRejectApplicant}
                          isLoading={isLoadingApplicants[job.id] || false}
                          complianceStatusByApplicant={complianceStatusByApplicant}
                        />
                      </div>
                    )}
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
