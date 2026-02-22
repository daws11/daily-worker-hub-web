"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { cancelApplication } from "@/lib/actions/job-applications"
import { Briefcase, Calendar, Building2, MapPin, Wallet, Loader2, X } from "lucide-react"

type WorkersRow = Database["public"]["Tables"]["workers"]["Row"]
type Job = Database["public"]["Tables"]["jobs"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

type ApplicationWithDetails = Booking & {
  jobs: {
    id: string
    title: string
    description: string
    budget_min: number
    budget_max: number
    deadline: string
    address: string
  }
  businesses: {
    id: string
    name: string
    phone: string
    email: string
  }
}

export default function WorkerJobsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [worker, setWorker] = useState<WorkersRow | null>(null)
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [applicationToCancel, setApplicationToCancel] = useState<ApplicationWithDetails | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

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

  // Fetch worker applications
  useEffect(() => {
    async function fetchApplications() {
      if (!worker) return

      setIsLoadingApplications(true)
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            jobs (
              id,
              title,
              description,
              budget_min,
              budget_max,
              deadline,
              address
            ),
            businesses (
              id,
              name,
              phone,
              email
            )
          `)
          .eq("worker_id", worker.id)
          .order("created_at", { ascending: false })

        if (error) {
          toast.error("Gagal memuat data lamaran")
          return
        }

        setApplications(data as ApplicationWithDetails[])
      } finally {
        setIsLoadingApplications(false)
      }
    }

    fetchApplications()
  }, [worker])

  // Format date to Indonesian locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
    status: ApplicationWithDetails["status"]
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending":
        return "outline"
      case "accepted":
        return "default"
      case "rejected":
        return "destructive"
      case "in_progress":
        return "secondary"
      case "completed":
        return "default"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Get status label in Indonesian
  const getStatusLabel = (status: ApplicationWithDetails["status"]): string => {
    switch (status) {
      case "pending":
        return "Menunggu"
      case "accepted":
        return "Diterima"
      case "rejected":
        return "Ditolak"
      case "in_progress":
        return "Sedang Berjalan"
      case "completed":
        return "Selesai"
      case "cancelled":
        return "Dibatalkan"
      default:
        return status
    }
  }

  // Handle cancel application
  const handleCancelApplication = async () => {
    if (!applicationToCancel || !worker) return

    setIsCancelling(true)
    try {
      const result = await cancelApplication(applicationToCancel.id, worker.id)

      if (!result.success) {
        toast.error(result.error || "Gagal membatalkan lamaran")
        return
      }

      toast.success("Lamaran berhasil dibatalkan")

      // Update local state - remove the cancelled application or update its status
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationToCancel.id
            ? { ...app, status: "cancelled" as const }
            : app
        )
      )

      setCancelDialogOpen(false)
      setApplicationToCancel(null)
    } finally {
      setIsCancelling(false)
    }
  }

  // Open cancel dialog
  const openCancelDialog = (application: ApplicationWithDetails) => {
    setApplicationToCancel(application)
    setCancelDialogOpen(true)
  }

  // Close cancel dialog
  const closeCancelDialog = () => {
    setCancelDialogOpen(false)
    setApplicationToCancel(null)
  }

  // Calculate stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    inProgress: applications.filter((a) => a.status === "in_progress").length,
    completed: applications.filter((a) => a.status === "completed").length,
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard Worker - Jobs</h1>
          <p className="text-[#666]">
            Kelola lamaran pekerjaan Anda
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Lamaran</CardDescription>
              <CardTitle className="text-3xl text-[#2563eb]">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Semua lamaran</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Menunggu</CardDescription>
              <CardTitle className="text-3xl text-[#f59e0b]">{stats.pending}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <span>Menunggu respons</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Diterima/Berjalan</CardDescription>
              <CardTitle className="text-3xl text-[#10b981]">{stats.accepted + stats.inProgress}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <span>Lamaran disetujui</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Selesai</CardDescription>
              <CardTitle className="text-3xl text-[#6b7280]">{stats.completed}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <span>Pekerjaan selesai</span>
            </CardContent>
          </Card>
        </div>

        {/* Application History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Lamaran</CardTitle>
            <CardDescription>
              Daftar pekerjaan yang Anda lamar ({applications.length} lamaran)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingApplications ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada lamaran. Mulai cari pekerjaan dan lamar sekarang!
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pekerjaan</TableHead>
                      <TableHead>Perusahaan</TableHead>
                      <TableHead>Tanggal Lamar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div className="font-medium">{application.jobs.title}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Wallet className="h-3 w-3" />
                              <span>
                                {formatBudget(application.jobs.budget_min)}
                                {application.jobs.budget_max > application.jobs.budget_min &&
                                  ` - ${formatBudget(application.jobs.budget_max)}`}
                              </span>
                            </div>
                            {application.jobs.address && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="line-clamp-1">
                                  {application.jobs.address}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{application.businesses.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(application.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(application.status)}>
                            {getStatusLabel(application.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {application.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCancelDialog(application)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Batalkan
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batalkan Lamaran?</DialogTitle>
              <DialogDescription>
                Anda yakin ingin membatalkan lamaran untuk pekerjaan{" "}
                <span className="font-semibold">
                  {applicationToCancel?.jobs.title}
                </span>
                ?
                <br />
                <br />
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeCancelDialog}
                disabled={isCancelling}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelApplication}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Membatalkan...
                  </>
                ) : (
                  "Ya, Batalkan Lamaran"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
