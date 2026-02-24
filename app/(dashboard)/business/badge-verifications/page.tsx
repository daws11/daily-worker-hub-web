"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Award, Loader2, CheckCircle2, XCircle, Clock, FileText, AlertCircle, Check, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { verifyBadge } from "@/lib/supabase/queries/badges"
import type { Database } from "@/lib/supabase/types"

type BusinessesRow = Database["public"]["Tables"]["businesses"]["Row"]
type BadgeRow = Database["public"]["Tables"]["badges"]["Row"]
type WorkersRow = Database["public"]["Tables"]["workers"]["Row"]

type PendingWorkerBadge = {
  id: string
  worker_id: string
  badge_id: string
  verification_status: 'pending' | 'verified' | 'rejected'
  verified_by: string | null
  verified_at: string | null
  created_at: string
  badge: BadgeRow
  worker: WorkersRow
}

export default function BusinessBadgeVerificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [business, setBusiness] = useState<BusinessesRow | null>(null)
  const [pendingVerifications, setPendingVerifications] = useState<PendingWorkerBadge[]>([])
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true)
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

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

  // Fetch pending badge verifications for this business's badges
  const fetchVerifications = useCallback(async () => {
    if (!business) return

    setIsLoadingVerifications(true)
    try {
      // Get all badges provided by this business
      const { data: businessBadges, error: badgesError } = await supabase
        .from("badges")
        .select("id")
        .eq("provider_id", business.id)

      if (badgesError) throw badgesError

      if (!businessBadges || businessBadges.length === 0) {
        setPendingVerifications([])
        return
      }

      const badgeIds = businessBadges.map(b => b.id)

      // Get pending worker_badges for these badges
      const { data: workerBadges, error: workerBadgesError } = await supabase
        .from("worker_badges" as any)
        .select(`
          *,
          badge:badges(*),
          worker:workers(*)
        `)
        .in("badge_id", badgeIds)
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false })

      if (workerBadgesError) throw workerBadgesError

      setPendingVerifications(workerBadges as unknown as PendingWorkerBadge[])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat data verifikasi"
      toast.error(message)
    } finally {
      setIsLoadingVerifications(false)
    }
  }, [business])

  useEffect(() => {
    if (business) {
      fetchVerifications()
    }
  }, [business, fetchVerifications])

  const handleVerify = async (workerBadgeId: string, status: 'verified' | 'rejected') => {
    if (!business) return

    setProcessingIds(prev => new Set(prev).add(workerBadgeId))

    try {
      await verifyBadge(workerBadgeId, business.id, status)

      toast.success(status === 'verified' ? 'Badge berhasil diverifikasi' : 'Badge ditolak')

      // Refresh the list
      await fetchVerifications()
    } catch (error) {
      const message = error instanceof Error ? error.message : `Gagal ${status === 'verified' ? 'memverifikasi' : 'menolak'} badge`
      toast.error(message)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(workerBadgeId)
        return newSet
      })
    }
  }

  // Format date to Indonesian locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (isLoadingBusiness) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat profil bisnis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Verifikasi Badge</h1>
          <p className="text-[#666]">
            Verifikasi badge yang diajukan oleh pekerja
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Menunggu Verifikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">
                  {pendingVerifications.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Badge Anda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">
                  {business ? (business.name || 'Bisnis') : '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Permintaan Verifikasi Badge
            </CardTitle>
            <CardDescription>
              Daftar badge yang menunggu verifikasi dari bisnis Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingVerifications ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Memuat data verifikasi...</p>
                </div>
              </div>
            ) : pendingVerifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Tidak ada badge yang menunggu verifikasi
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Semua badge telah diproses
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVerifications.map((wb) => {
                  const isProcessing = processingIds.has(wb.id)

                  return (
                    <Card key={wb.id} className="border-yellow-200 dark:border-yellow-800">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {/* Worker Info */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {wb.worker.full_name || 'Pekerja'}
                                </h3>
                                {wb.worker.bio && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {wb.worker.bio}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">{wb.badge.name}</span>
                                {wb.badge.is_certified && (
                                  <Badge variant="outline" className="text-xs">
                                    Certified
                                  </Badge>
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
                              <Clock className="h-3.5 w-3.5" />
                              Menunggu
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-3 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerify(wb.id, 'rejected')}
                              disabled={isProcessing}
                              className="gap-1.5"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                              Tolak
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleVerify(wb.id, 'verified')}
                              disabled={isProcessing}
                              className="gap-1.5"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Verifikasi
                            </Button>
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
      </div>
    </div>
  )
}
