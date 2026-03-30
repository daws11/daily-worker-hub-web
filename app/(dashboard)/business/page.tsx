"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { DashboardGreeting } from "@/components/dashboard/greeting";
import { QuickStats, type BusinessStats } from "@/components/dashboard/quick-stats";
import { UpcomingBookings } from "@/components/dashboard/upcoming-bookings";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useTranslation } from "@/lib/i18n/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  Clock,
  ArrowRight,
  Plus,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Local Booking type for dashboard - matches Supabase query result shape
interface Booking {
  id: string;
  status: "cancelled" | "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "no_show";
  start_date: string;
  end_date: string;
  final_price: number;
  jobs?: {
    id: string;
    title: string;
    address?: string | null;
  } | null;
  workers?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

interface WalletData {
  available_balance: number;
  pending_balance: number;
}

interface RecentActivity {
  id: string;
  type: "booking" | "payment" | "worker" | "job";
  title: string;
  description: string;
  time: string;
  status?: string;
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

export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Get business ID
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!business) {
          setIsLoading(false);
          return;
        }

        // Fetch wallet
        const { data: walletData } = await supabase
          .from("wallets")
          .select("available_balance, pending_balance")
          .eq("user_id", user.id)
          .single();
        
        if (walletData) setWallet(walletData);

        // Fetch jobs
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id, status")
          .eq("business_id", business.id);

        const activeJobs = jobs?.filter(j => j.status === "open" || j.status === "in_progress").length || 0;

        // Fetch bookings
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, status, start_date, end_date, final_price, jobs (id, title, address), workers (id, full_name, avatar_url)")
          .eq("business_id", business.id)
          .order("start_date", { ascending: true })
          .limit(5);

        if (bookings) setUpcomingBookings(bookings);

        // Fetch reviews count
        const { count: reviewCount } = await supabase
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id);

        // Calculate total spent - first get business wallet
        if (!business) return;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const walletQuery = supabase as any;
        const { data: businessWallet }: { data: any } = await walletQuery
          .from("wallets")
          .select("id")
          .eq("business_id", business.id as string)
          .maybeSingle();

        if (!businessWallet) {
          setStats({
            activeJobs,
            workersApplied: activeJobs * 3,
            pendingReviews: reviewCount || 0,
            totalSpent: 0,
          });
          return;
        }

        const walletId = businessWallet.id;
        const { data: wtData, error: wtError } = await supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("wallet_id", walletId)
          .eq("type", "debit");
        if (wtError) {
          console.error("Error fetching wallet transactions:", wtError);
          setStats({
            activeJobs,
            workersApplied: activeJobs * 3,
            pendingReviews: reviewCount || 0,
            totalSpent: 0,
          });
          return;
        }
        const transactions = wtData as { amount: number }[] | null;
        const totalSpent = transactions?.reduce((sum, t) => sum + (t.amount || 1), 0) || 0;
        setStats({
          activeJobs,
          workersApplied: activeJobs * 3,
          pendingReviews: reviewCount || 0,
          totalSpent,
        });

        // Generate activities from bookings
        const newActivities: RecentActivity[] = (bookings || []).slice(0, 5).map(b => ({
          id: b.id,
          type: "booking" as const,
          title: b.jobs?.title || "Pekerjaan",
          description: b.workers?.full_name || "Pekerja",
          time: b.start_date || "",
          status: b.status,
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
        <DashboardGreeting />
      </div>

      {/* Wallet Card - Highlight */}
      <div className="animate-slide-up animation-delay-100">
        <Link href="/business/wallet">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-foreground/80 text-sm font-medium">Saldo Wallet</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">
                    {wallet ? formatCurrency(wallet.available_balance) : "Rp 0"}
                  </p>
                  {wallet && wallet.pending_balance > 0 && (
                    <p className="text-xs text-primary-foreground/70 mt-1">
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
                  <Plus className="h-4 w-4 mr-1" /> Top Up
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
        <QuickStats stats={stats} role="business" isLoading={isLoading} />
      </div>

      {/* Quick Actions */}
      <div className="animate-slide-up animation-delay-300">
        <QuickActions role="business" />
      </div>

      {/* Recent Activity */}
      <div className="animate-slide-up animation-delay-400">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Aktivitas Terkini</CardTitle>
              <Link href="/business/bookings">
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
              </div>
            ) : (
              activities.map((activity) => (
                <Link 
                  key={activity.id} 
                  href={`/business/bookings`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    activity.status === "completed" ? "bg-green-100 text-green-600" :
                    activity.status === "in_progress" ? "bg-blue-100 text-blue-600" :
                    "bg-yellow-100 text-yellow-600"
                  )}>
                    {activity.status === "completed" ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activity.time ? formatRelativeTime(activity.time) : ""}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <div className="animate-slide-up animation-delay-400">
        <UpcomingBookings bookings={upcomingBookings} role="business" isLoading={isLoading} />
      </div>
    </div>
  );
}
