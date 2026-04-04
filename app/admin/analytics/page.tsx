"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Briefcase,
  CreditCard,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getRevenueMetrics,
  getWorkerStatistics,
  getBookingTrends,
  getPaymentMetrics,
  type RevenueMetrics,
  type WorkerStatistics,
  type BookingTrends,
  type PaymentMetrics,
} from "@/lib/actions/admin-analytics";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(
    null,
  );
  const [workerStats, setWorkerStats] = useState<WorkerStatistics | null>(null);
  const [bookingTrends, setBookingTrends] = useState<BookingTrends | null>(
    null,
  );
  const [paymentMetrics, setPaymentMetrics] = useState<PaymentMetrics | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/admin/analytics");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadAnalytics() {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const days = parseInt(dateRange);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const endDate = new Date().toISOString().split("T")[0];

        const [revenue, workers, bookings, payments] = await Promise.all([
          getRevenueMetrics(startDate, endDate),
          getWorkerStatistics(),
          getBookingTrends(startDate, endDate),
          getPaymentMetrics(),
        ]);

        if (revenue.data) setRevenueMetrics(revenue.data);
        if (workers.data) setWorkerStats(workers.data);
        if (bookings.data) setBookingTrends(bookings.data);
        if (payments.data) setPaymentMetrics(payments.data);

        if (
          revenue.error ||
          workers.error ||
          bookings.error ||
          payments.error
        ) {
          setError(
            revenue.error ||
              workers.error ||
              bookings.error ||
              payments.error ||
              "Failed to load some data",
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load analytics",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadAnalytics();
    }
  }, [user, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Platform performance metrics and insights
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as string)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueMetrics?.totals.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {revenueMetrics?.totals.totalBookings || 0} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueMetrics?.totals.totalFees || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg:{" "}
              {formatCurrency(revenueMetrics?.totals.averagePerBooking || 0)}
              /booking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Workers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workerStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {workerStats?.newThisMonth || 0} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payment Success
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paymentMetrics?.successRate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentMetrics?.successfulPayments || 0} successful
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed analytics */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Daily Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Revenue
                </CardTitle>
                <CardDescription>
                  Revenue over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueMetrics?.daily.slice(-7).map((day) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{day.date}</p>
                        <p className="text-xs text-muted-foreground">
                          {day.bookings} bookings
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(day.revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fees: {formatCurrency(day.fees)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Revenue
                </CardTitle>
                <CardDescription>Weekly revenue breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueMetrics?.weekly.slice(-4).map((week) => (
                    <div
                      key={week.week}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          Week of {week.week}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {week.bookings} bookings
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(week.revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fees: {formatCurrency(week.fees)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Summary</CardTitle>
              <CardDescription>
                Monthly revenue and fees breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueMetrics?.monthly.map((month) => (
                  <div
                    key={month.month}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{month.month}</p>
                      <p className="text-sm text-muted-foreground">
                        {month.bookings} bookings
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(month.revenue)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Fees: {formatCurrency(month.fees)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Workers by Tier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Workers by Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workerStats?.byTier && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge className="bg-amber-700">Champion</Badge>
                        </span>
                        <span className="font-medium">
                          {workerStats.byTier.champion}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge className="bg-yellow-500">Elite</Badge>
                        </span>
                        <span className="font-medium">
                          {workerStats.byTier.elite}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge className="bg-gray-400">Pro</Badge>
                        </span>
                        <span className="font-medium">
                          {workerStats.byTier.pro}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge className="bg-amber-700">Classic</Badge>
                        </span>
                        <span className="font-medium">
                          {workerStats.byTier.classic}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Workers by KYC Status */}
            <Card>
              <CardHeader>
                <CardTitle>KYC Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workerStats?.byKycStatus && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge variant="default">Verified</Badge>
                        </span>
                        <span className="font-medium">
                          {workerStats.byKycStatus.verified}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge variant="secondary">Pending</Badge>
                        </span>
                        <span className="font-medium">
                          {workerStats.byKycStatus.pending}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline">Unverified</Badge>
                        </span>
                        <span className="font-medium">
                          {workerStats.byKycStatus.unverified}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workers by Area */}
          <Card>
            <CardHeader>
              <CardTitle>Workers by Area</CardTitle>
              <CardDescription>Top 10 areas by worker count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {workerStats?.byArea.map((area) => (
                  <div
                    key={area.area}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted"
                  >
                    <span className="text-sm">{area.area}</span>
                    <Badge variant="secondary">{area.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {/* Booking Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Booking Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
                {bookingTrends?.byStatus.map((status) => (
                  <div
                    key={status.status}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <span className="text-sm capitalize">
                      {status.status.replace("_", " ")}
                    </span>
                    <Badge variant="secondary">{status.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Booking Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Booking Trends</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingTrends?.daily.slice(-7).map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{day.date}</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="font-medium text-green-600">
                          {day.created}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          Completed
                        </p>
                        <p className="font-medium text-blue-600">
                          {day.completed}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          Cancelled
                        </p>
                        <p className="font-medium text-red-600">
                          {day.cancelled}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bookings by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Bookings by Category</CardTitle>
              <CardDescription>
                Top 10 categories by booking count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {bookingTrends?.byCategory.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted"
                  >
                    <span className="text-sm">{cat.category}</span>
                    <Badge variant="secondary">{cat.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {paymentMetrics?.totalTransactions || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Successful</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {paymentMetrics?.successfulPayments || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {paymentMetrics?.failedPayments || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(paymentMetrics?.totalVolume || 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Success Rate</CardTitle>
              <CardDescription>
                Overall payment processing performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Success Rate</span>
                  <span className="text-2xl font-bold">
                    {paymentMetrics?.successRate.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all"
                    style={{ width: `${paymentMetrics?.successRate || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {paymentMetrics?.successfulPayments || 0} successful
                    payments
                  </span>
                  <span>{paymentMetrics?.pendingPayments || 0} pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
