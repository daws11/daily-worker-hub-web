"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { DashboardGreeting } from "@/components/dashboard/greeting";
import { QuickStats, type WorkerStats } from "@/components/dashboard/quick-stats";
import { UpcomingBookings } from "@/components/dashboard/upcoming-bookings";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useTranslation } from "@/lib/i18n/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  final_price: number | null;
  jobs?: {
    id: string;
    title: string;
    address?: string | null;
  }[] | null;
  businesses?: {
    id: string;
    name: string;
  }[] | null;
}

interface WalletData {
  available_balance: number;
  pending_balance: number;
}

interface RecentActivity {
  id: string;
  type: "booking" | "payment" | "job";
  title: string;
  description: string;
  time: string;
  status?: string;
  amount?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m lalu`;
  if (hours < 24) return `${hours}j lalu`;
  return `${days}h lalu`;
}

export default function WorkerDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workerName, setWorkerName] = useState<string>("");

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Get worker profile
        const { data: worker } = await (supabase as any)
          .from("workers")
          .select("id, rating, full_name")
          .eq("user_id", user.id)
          .single();

        if (worker?.full_name) {
          setWorkerName(worker.full_name);
        }

        // Fetch wallet
        const { data: walletData } = await (supabase as any)
          .from("wallets")
          .select("available_balance, pending_balance")
          .eq("user_id", user.id)
          .single();
        
        if (walletData) setWallet(walletData);

        // Fetch open jobs count
        const { count: openJobs } = await (supabase as any)
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("status", "open");

        // Fetch worker bookings
        const workerId = worker?.id || user.id;
        
        const { data: bookings } = await (supabase as any)
          .from("bookings")
          .select("id, status, start_date, end_date, final_price, jobs (id, title, address), businesses (id, name)")
          .eq("worker_id", workerId)
          .order("start_date", { ascending: true })
          .limit(10);

        if (bookings) {
          // Transform data to match expected array format for jobs and businesses
          const transformedBookings = (bookings as any[]).map((booking: any) => ({
            ...booking,
            jobs: booking.jobs ? [booking.jobs] : null,
            businesses: booking.businesses ? [booking.businesses] : null,
          }));
          setUpcomingBookings(transformedBookings);
        }

        // Calculate earnings this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);


        const txQuery = supabase as any;
        const { data: transactions }: { data: any } = await txQuery
          .from("wallet_transactions")
          .select("amount, created_at")
          .eq("user_id", user.id as string)
          .eq("type", "credit")
          .gte("created_at", startOfMonth.toISOString());

        const earnedThisMonth = (transactions as any[])?.reduce((sum: any, t: any) => sum + (t.amount || 0), 0) || 0;

        // Active bookings
        const activeBookings = (bookings as any[])?.filter((b: any) => 
          b.status === "accepted" || b.status === "in_progress"
        ).length || 0;

        setStats({
          openJobs: openJobs || 0,
          activeBookings,
          earnedThisMonth,
          rating: worker?.rating || 0,
        });

        // Generate activities
        const newActivities: RecentActivity[] = ((bookings as any[]) || []).slice(0, 5).map((b: any) => ({
          id: b.id,
          type: "booking" as const,
          title: b.jobs?.title || "Pekerjaan",
          description: b.businesses?.name || "Usaha",
          time: b.start_date || "",
          status: b.status,
          amount: b.final_price,
        }));
        setActivities(newActivities);

      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 animate-fade-in">
      {/* Greeting */}
      <div className="animate-slide-up">
        <DashboardGreeting role="worker" name={workerName} />
      </div>

      {/* Wallet Card - Highlight */}
      <div className="animate-slide-up animation-delay-100">
        <Link href="/worker/wallet">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Saldo Earnings</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">
                    {wallet ? formatCurrency(wallet.available_balance) : "Rp 0"}
                  </p>
                  {wallet && wallet.pending_balance > 0 && (
                    <p className="text-xs text-emerald-100 mt-1">
                      +{formatCurrency(wallet.pending_balance)} pending
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                  <ArrowRight className="h-4 w-4 mr-1" /> Tarik Dana
                </Button>
                <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                  Riwayat
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="animate-slide-up animation-delay-200">
        <QuickStats stats={stats} role="worker" isLoading={isLoading} />
      </div>

      {/* Quick Actions */}
      <div className="animate-slide-up animation-delay-300">
        <QuickActions role="worker" />
      </div>

      {/* Recent Activity */}
      <div className="animate-slide-up animation-delay-400">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Aktivitas Terkini</CardTitle>
              <Link href="/worker/bookings">
                <Button variant="ghost" size="sm" className="text-primary">
                  Lihat Semua <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada aktivitas</p>
                <Link href="/worker/jobs">
                  <Button variant="link" className="mt-2 text-primary">
                    Cari Lowongan <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              activities.map((activity) => (
                <Link 
                  key={activity.id} 
                  href={`/worker/bookings`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    activity.status === "completed" ? "bg-green-100 text-green-600" :
                    activity.status === "in_progress" ? "bg-blue-100 text-blue-600" :
                    activity.status === "accepted" ? "bg-yellow-100 text-yellow-600" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {activity.status === "completed" ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : activity.status === "in_progress" ? (
                      <Clock className="h-5 w-5" />
                    ) : (
                      <Briefcase className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <div className="text-right">
                    {activity.amount && (
                      <p className="text-sm font-medium text-green-600">
                        +{formatCurrency(activity.amount)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {activity.time ? formatRelativeTime(activity.time) : ""}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <div className="animate-slide-up animation-delay-400">
        <UpcomingBookings bookings={upcomingBookings} role="worker" isLoading={isLoading} />
      </div>
    </div>
  );
}
