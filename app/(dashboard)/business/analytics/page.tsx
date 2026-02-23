"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { BarChart3, Loader2, TrendingUp, Eye, MessageCircle, Share2, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react"

type BusinessesRow = Database["public"]["Tables"]["businesses"]["Row"]

type JobPostRow = Database["public"]["Tables"]["job_posts"]["Row"]

type JobPostWithConnection = JobPostRow & {
  social_platforms?: {
    id: string
    platform_name: string
    platform_type: Database["public"]["Enums"]["social_platform_type"]
  } | null
}

type PostMetrics = {
  views?: number
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
  impressions?: number
  reach?: number
}

type AnalyticsStats = {
  totalPosts: number
  successfulPosts: number
  pendingPosts: number
  failedPosts: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgEngagementRate: number
}

export default function BusinessAnalyticsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [business, setBusiness] = useState<BusinessesRow | null>(null)
  const [posts, setPosts] = useState<JobPostWithConnection[]>([])
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)

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

  // Fetch job posts with metrics
  useEffect(() => {
    async function fetchPosts() {
      if (!business) return

      setIsLoadingPosts(true)
      try {
        // First, get all job IDs for this business
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("id")
          .eq("business_id", business.id)

        if (jobsError) {
          toast.error("Gagal memuat data lowongan")
          return
        }

        if (!jobsData || jobsData.length === 0) {
          setPosts([])
          setStats({
            totalPosts: 0,
            successfulPosts: 0,
            pendingPosts: 0,
            failedPosts: 0,
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            avgEngagementRate: 0,
          })
          setIsLoadingPosts(false)
          return
        }

        const jobIds = jobsData.map(j => j.id)

        // Now fetch job posts with platform info
        const { data, error } = await supabase
          .from("job_posts")
          .select(`
            *,
            business_social_connections!inner (
              social_platforms (
                id,
                platform_name,
                platform_type
              )
            )
          `)
          .in("job_id", jobIds)
          .order("created_at", { ascending: false })

        if (error) {
          toast.error("Gagal memuat data analitik")
          return
        }

        // Transform data to flatten platform info
        const transformedPosts = (data || []).map((post: any) => ({
          ...post,
          social_platforms: post.business_social_connections?.social_platforms || null,
        }))

        setPosts(transformedPosts as JobPostWithConnection[])

        // Calculate statistics
        calculateStats(transformedPosts as JobPostWithConnection[])
      } finally {
        setIsLoadingPosts(false)
      }
    }

    fetchPosts()
  }, [business])

  // Calculate analytics statistics
  const calculateStats = (postData: JobPostWithConnection[]) => {
    const successfulPosts = postData.filter(p => p.status === "posted")
    const pendingPosts = postData.filter(p => p.status === "pending")
    const failedPosts = postData.filter(p => p.status === "failed")

    let totalViews = 0
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0

    successfulPosts.forEach(post => {
      const metrics = (post.metrics || {}) as PostMetrics
      totalViews += metrics.views || metrics.impressions || 0
      totalLikes += metrics.likes || 0
      totalComments += metrics.comments || 0
      totalShares += metrics.shares || 0
    })

    const avgEngagementRate = totalViews > 0
      ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
      : 0

    setStats({
      totalPosts: postData.length,
      successfulPosts: successfulPosts.length,
      pendingPosts: pendingPosts.length,
      failedPosts: failedPosts.length,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      avgEngagementRate,
    })
  }

  // Get status badge variant and icon
  const getStatusInfo = (status: Database["public"]["Enums"]["job_post_status"]) => {
    switch (status) {
      case "posted":
        return {
          variant: "default" as const,
          label: "Terbit",
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
        }
      case "pending":
        return {
          variant: "secondary" as const,
          label: "Menunggu",
          icon: Clock,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        }
      case "failed":
        return {
          variant: "destructive" as const,
          label: "Gagal",
          icon: XCircle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
        }
      case "deleted":
        return {
          variant: "outline" as const,
          label: "Dihapus",
          icon: AlertCircle,
          className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
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

  // Get platform icon
  const getPlatformIcon = (platformType: string) => {
    switch (platformType) {
      case "facebook":
        return "📘"
      case "instagram":
        return "📷"
      case "linkedin":
        return "💼"
      case "twitter":
        return "🐦"
      default:
        return "📱"
    }
  }

  // Format number to Indonesian locale
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}jt`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}rb`
    }
    return num.toString()
  }

  // Format date to Indonesian locale
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get metrics from post
  const getPostMetrics = (post: JobPostWithConnection): PostMetrics => {
    return (post.metrics || {}) as PostMetrics
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
          <h1 className="text-2xl font-bold">Analitik Media Sosial</h1>
          <p className="text-[#666]">
            Pantau performa postingan lowongan kerja di berbagai platform
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Posts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Postingan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">{stats?.totalPosts || 0}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.successfulPosts || 0} berhasil terbit
              </p>
            </CardContent>
          </Card>

          {/* Total Views */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Dilihat
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">{formatNumber(stats?.totalViews || 0)}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Impressions semua postingan
              </p>
            </CardContent>
          </Card>

          {/* Total Engagement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold">
                    {formatNumber((stats?.totalLikes || 0) + (stats?.totalComments || 0) + (stats?.totalShares || 0))}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Likes, comments & shares
              </p>
            </CardContent>
          </Card>

          {/* Engagement Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rata-rata Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-orange-600" />
                  <span className="text-2xl font-bold">
                    {stats?.avgEngagementRate ? stats.avgEngagementRate.toFixed(2) : "0.00"}%
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Tingkat interaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Likes</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {isLoadingPosts ? <Loader2 className="h-5 w-5 animate-spin" /> : formatNumber(stats?.totalLikes || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Komentar</p>
                  <p className="text-2xl font-bold text-green-600">
                    {isLoadingPosts ? <Loader2 className="h-5 w-5 animate-spin" /> : formatNumber(stats?.totalComments || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shares</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {isLoadingPosts ? <Loader2 className="h-5 w-5 animate-spin" /> : formatNumber(stats?.totalShares || 0)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Share2 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Performa Postingan</CardTitle>
            <CardDescription>
              Detail performa setiap postingan lowongan kerja
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada data analitik. Mulai posting lowongan kerja ke media sosial!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead>Tanggal Posting</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dilihat</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Komentar</TableHead>
                      <TableHead>Shares</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => {
                      const statusInfo = getStatusInfo(post.status)
                      const StatusIcon = statusInfo.icon
                      const metrics = getPostMetrics(post)

                      return (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getPlatformIcon(post.social_platforms?.platform_type || "")}</span>
                              <span className="font-medium capitalize">
                                {post.social_platforms?.platform_name || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {post.posted_at ? formatDate(post.posted_at) : formatDate(post.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.className} variant={statusInfo.variant}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatNumber(metrics.views || metrics.impressions || 0)}
                          </TableCell>
                          <TableCell>
                            {formatNumber(metrics.likes || 0)}
                          </TableCell>
                          <TableCell>
                            {formatNumber(metrics.comments || 0)}
                          </TableCell>
                          <TableCell>
                            {formatNumber(metrics.shares || 0)}
                          </TableCell>
                          <TableCell>
                            {post.platform_post_url ? (
                              <a
                                href={post.platform_post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                Lihat <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
