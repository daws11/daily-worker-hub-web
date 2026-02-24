"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, Loader2, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { getWorkerBadges, getBadges } from "@/lib/supabase/queries/badges"
import { BadgeGrid, type BadgeWithStatus } from "@/components/badge/badge-grid"
import { BadgeVerificationForm } from "@/components/badge/badge-verification-form"

type WorkersRow = Database["public"]["Tables"]["workers"]["Row"]
type Badge = Database["public"]["Tables"]["badges"]["Row"]

type WorkerBadgeWithBadge = {
  id: string
  worker_id: string
  badge_id: string
  verification_status: 'pending' | 'verified' | 'rejected'
  verified_by: string | null
  verified_at: string | null
  created_at: string
  badge: Badge
}

export default function WorkerBadgesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [worker, setWorker] = useState<WorkersRow | null>(null)
  const [workerBadges, setWorkerBadges] = useState<WorkerBadgeWithBadge[]>([])
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([])
  const [isLoadingWorker, setIsLoadingWorker] = useState(true)
  const [isLoadingBadges, setIsLoadingBadges] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  // Fetch worker badges and available badges
  useEffect(() => {
    async function fetchBadges() {
      if (!worker) return

      setIsLoadingBadges(true)
      try {
        // Fetch worker badges with badge details
        const { data: workerBadgesData, error: workerBadgesError } = await supabase
          .from("worker_badges" as any)
          .select(`
            *,
            badge:badges(*)
          `)
          .eq("worker_id", worker.id)
          .order("created_at", { ascending: false })

        if (workerBadgesError) {
          toast.error("Gagal memuat badge Anda")
          return
        }

        setWorkerBadges(workerBadgesData as unknown as WorkerBadgeWithBadge[])

        // Fetch all available badges
        const allBadges = await getBadges()

        // Filter out badges the worker already has
        const workerBadgeIds = (workerBadgesData as unknown as WorkerBadgeWithBadge[]).map(wb => wb.badge_id)
        const available = allBadges.filter(badge => !workerBadgeIds.includes(badge.id))

        setAvailableBadges(available)
      } finally {
        setIsLoadingBadges(false)
      }
    }

    fetchBadges()
  }, [worker])

  // Refresh data after requesting a badge
  const handleBadgeRequestSuccess = async () => {
    setIsRefreshing(true)
    try {
      // Re-fetch worker badges
      const { data: workerBadgesData, error: workerBadgesError } = await supabase
        .from("worker_badges" as any)
        .select(`
          *,
          badge:badges(*)
        `)
        .eq("worker_id", worker?.id)
        .order("created_at", { ascending: false })

      if (!workerBadgesError && workerBadgesData) {
        setWorkerBadges(workerBadgesData as unknown as WorkerBadgeWithBadge[])

        // Update available badges
        const allBadges = await getBadges()
        const workerBadgeIds = (workerBadgesData as unknown as WorkerBadgeWithBadge[]).map(wb => wb.badge_id)
        const available = allBadges.filter(badge => !workerBadgeIds.includes(badge.id))
        setAvailableBadges(available)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // Get status badge variant and icon
  const getStatusInfo = (status: WorkerBadgeWithBadge["verification_status"]) => {
    switch (status) {
      case "verified":
        return {
          variant: "default" as const,
          label: "Terverifikasi",
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
        }
      case "pending":
        return {
          variant: "secondary" as const,
          label: "Menunggu Verifikasi",
          icon: Clock,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        }
      case "rejected":
        return {
          variant: "destructive" as const,
          label: "Ditolak",
          icon: XCircle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
        }
      default:
        return {
          variant: "outline" as const,
          label: status,
          icon: AlertCircle,
          className: "",
        }
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

  if (isLoadingWorker) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat profil worker...</p>
        </div>
      </div>
    )
  }

  // Group badges by verification status
  const verifiedBadges = workerBadges.filter(wb => wb.verification_status === "verified")
  const pendingBadges = workerBadges.filter(wb => wb.verification_status === "pending")
  const rejectedBadges = workerBadges.filter(wb => wb.verification_status === "rejected")

  // Transform worker badges to BadgeWithStatus for BadgeGrid
  const verifiedBadgesWithStatus: BadgeWithStatus[] = verifiedBadges.map(wb => ({
    ...wb.badge,
    verificationStatus: wb.verification_status,
    verifiedAt: wb.verified_at,
  }))

  const pendingBadgesWithStatus: BadgeWithStatus[] = pendingBadges.map(wb => ({
    ...wb.badge,
    verificationStatus: wb.verification_status,
    verifiedAt: wb.verified_at,
  }))

  const rejectedBadgesWithStatus: BadgeWithStatus[] = rejectedBadges.map(wb => ({
    ...wb.badge,
    verificationStatus: wb.verification_status,
    verifiedAt: wb.verified_at,
  }))

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Badge Saya</h1>
          <p className="text-[#666]">
            Kelola dan tampilkan keahlian Anda melalui badge
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Badge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{workerBadges.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Terverifikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{verifiedBadges.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Menunggu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">{pendingBadges.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tersedia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{availableBadges.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Badges Tabs */}
        <Tabs defaultValue="verified" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="verified">
              Terverifikasi ({verifiedBadges.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Menunggu ({pendingBadges.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Ditolak ({rejectedBadges.length})
            </TabsTrigger>
            <TabsTrigger value="request">
              Request Baru
            </TabsTrigger>
          </TabsList>

          {/* Verified Badges Tab */}
          <TabsContent value="verified" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Badge Terverifikasi
                </CardTitle>
                <CardDescription>
                  Badge yang telah diverifikasi dan ditampilkan di profil Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBadges ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : verifiedBadges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Belum ada badge terverifikasi
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Request badge baru untuk memulai
                    </p>
                  </div>
                ) : (
                  <BadgeGrid
                    badges={verifiedBadgesWithStatus}
                    size="md"
                    showVerificationStatus={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Badges Tab */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Badge Menunggu Verifikasi
                </CardTitle>
                <CardDescription>
                  Badge yang sedang dalam proses verifikasi oleh admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBadges ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : pendingBadges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Tidak ada badge yang menunggu verifikasi
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingBadges.map((wb) => {
                      const statusInfo = getStatusInfo(wb.verification_status)
                      const StatusIcon = statusInfo.icon

                      return (
                        <Card key={wb.id} className="border-yellow-200 dark:border-yellow-800">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{wb.badge.name}</h3>
                                  {wb.badge.is_certified && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                      Certified
                                    </span>
                                  )}
                                </div>
                                {wb.badge.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {wb.badge.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Diminta pada {formatDate(wb.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                <StatusIcon className="h-3.5 w-3.5" />
                                {statusInfo.label}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rejected Badges Tab */}
          <TabsContent value="rejected" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Badge Ditolak
                </CardTitle>
                <CardDescription>
                  Badge yang ditolak. Anda dapat request ulang dengan dokumen yang lebih lengkap
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBadges ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : rejectedBadges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Tidak ada badge yang ditolak
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rejectedBadges.map((wb) => {
                      const statusInfo = getStatusInfo(wb.verification_status)
                      const StatusIcon = statusInfo.icon

                      return (
                        <Card key={wb.id} className="border-red-200 dark:border-red-800">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{wb.badge.name}</h3>
                                  {wb.badge.is_certified && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                      Certified
                                    </span>
                                  )}
                                </div>
                                {wb.badge.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {wb.badge.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Ditolak pada {formatDate(wb.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                <StatusIcon className="h-3.5 w-3.5" />
                                {statusInfo.label}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Request New Badge Tab */}
          <TabsContent value="request" className="space-y-4">
            {worker && (
              <BadgeVerificationForm
                workerId={worker.id}
                availableBadges={availableBadges}
                onSuccess={handleBadgeRequestSuccess}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
