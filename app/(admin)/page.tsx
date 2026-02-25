"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  Briefcase,
  FileCheck,
  Clock,
  ArrowRight,
  Shield,
  Building2,
  UserCheck,
  Activity,
} from "lucide-react"

import { AnalyticsCard } from "@/components/admin/analytics-card"
import { useAuth } from "@/app/providers/auth-provider"
import { getPlatformMetrics } from "@/lib/supabase/queries/analytics"
import { getAdminPendingCounts } from "@/lib/supabase/queries/admin"
import { getRecentAuditLogs } from "@/lib/supabase/queries/audit-logs"
import type { PlatformMetrics } from "@/lib/types/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [pendingCounts, setPendingCounts] = useState<{
    businessVerifications: number
    kycVerifications: number
    reports: number
    disputes: number
  } | null>(null)
  const [recentLogs, setRecentLogs] = useState<any[] | null>(null)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/admin")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return

      setIsDataLoading(true)
      setError(null)

      try {
        const [metricsResult, pendingResult, logsResult] = await Promise.all([
          getPlatformMetrics(),
          getAdminPendingCounts(),
          getRecentAuditLogs(10),
        ])

        if (metricsResult) {
          setMetrics(metricsResult)
        } else {
          throw new Error("Failed to load metrics")
        }

        if (pendingResult.data) {
          setPendingCounts(pendingResult.data)
        }

        if (logsResult) {
          setRecentLogs(logsResult)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data")
      } finally {
        setIsDataLoading(false)
      }
    }

    if (user) {
      loadDashboardData()
    }
  }, [user])

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      approve_business: "Approved Business",
      reject_business: "Rejected Business",
      approve_kyc: "Approved KYC",
      reject_kyc: "Rejected KYC",
      suspend_user: "Suspended User",
      ban_user: "Banned User",
      resolve_dispute: "Resolved Dispute",
      dismiss_report: "Dismissed Report",
      delete_job: "Deleted Job",
    }
    return actionMap[action] || action
  }

  const getActionColor = (action: string) => {
    if (action.includes("approve")) return "default"
    if (action.includes("reject") || action.includes("ban") || action.includes("delete")) return "destructive"
    if (action.includes("suspend")) return "secondary"
    return "outline"
  }

  const totalPending = pendingCounts
    ? pendingCounts.businessVerifications + pendingCounts.kycVerifications + pendingCounts.reports + pendingCounts.disputes
    : 0

  if (authLoading || isDataLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of platform activity</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of platform activity and pending items</p>
        </div>
        {totalPending > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {totalPending} pending items
          </Badge>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          title="Total Users"
          value={metrics?.users.total || 0}
          description={`${metrics?.users.workers || 0} workers • ${metrics?.users.businesses || 0} businesses`}
          icon={<Users className="h-4 w-4" />}
        />
        <AnalyticsCard
          title="Active Jobs"
          value={metrics?.jobs.active || 0}
          description={`${metrics?.jobs.newThisWeek || 0} new this week`}
          icon={<Briefcase className="h-4 w-4" />}
          trend={metrics?.jobs.newThisWeek ? { value: 0, label: "this week" } : undefined}
        />
        <AnalyticsCard
          title="Pending Verifications"
          value={(pendingCounts?.businessVerifications || 0) + (pendingCounts?.kycVerifications || 0)}
          description={`${pendingCounts?.businessVerifications || 0} business • ${pendingCounts?.kycVerifications || 0} KYC`}
          icon={<FileCheck className="h-4 w-4" />}
        />
        <AnalyticsCard
          title="Active Bookings"
          value={metrics?.bookings.inProgress || 0}
          description={`${metrics?.bookings.pending || 0} pending • ${metrics?.bookings.completed || 0} completed`}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/businesses" className="group">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Business Verifications</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCounts?.businessVerifications || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending approvals</p>
              <div className="flex items-center text-xs text-muted-foreground mt-2 group-hover:text-foreground">
                Review <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/kycs" className="group">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KYC Verifications</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCounts?.kycVerifications || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending approvals</p>
              <div className="flex items-center text-xs text-muted-foreground mt-2 group-hover:text-foreground">
                Review <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/disputes" className="group">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disputes</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCounts?.disputes || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Requires resolution</p>
              <div className="flex items-center text-xs text-muted-foreground mt-2 group-hover:text-foreground">
                Resolve <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users" className="group">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Management</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total users</p>
              <div className="flex items-center text-xs text-muted-foreground mt-2 group-hover:text-foreground">
                Manage <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs && recentLogs.length > 0 ? (
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="text-muted-foreground">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {log.admin?.user?.full_name || "Admin"}
                      </span>
                      <Badge variant={getActionColor(log.action) as any} className="text-xs">
                        {getActionLabel(log.action)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
