"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { DashboardGreeting } from "@/components/dashboard/greeting";
import { QuickStats, type BusinessStats } from "@/components/dashboard/quick-stats";
import { UpcomingBookings } from "@/components/dashboard/upcoming-bookings";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useTranslation } from "@/lib/i18n/hooks";

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
  } | null;
  workers?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

export default function BusinessDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Get business ID for this user
        const { data: business, error: businessError } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (businessError || !business) {
          console.error("Failed to fetch business:", businessError);
          setIsLoading(false);
          return;
        }

        // Fetch jobs for this business
        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id, status")
          .eq("business_id", business.id);

        if (jobsError) {
          console.error("Failed to fetch jobs:", jobsError);
        }

        // Fetch bookings for this business
        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select(
            `
            id,
            status,
            start_date,
            end_date,
            final_price,
            jobs (id, title, address),
            workers (id, full_name, avatar_url)
          `
          )
          .eq("business_id", business.id)
          .order("start_date", { ascending: true });

        if (bookingsError) {
          console.error("Failed to fetch bookings:", bookingsError);
        }

        // Fetch wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("available_balance, pending_balance")
          .eq("user_id", user.id)
          .single();

        if (walletError && walletError.code !== "PGRST116") {
          console.error("Failed to fetch wallet:", walletError);
        }

        // Calculate stats
        const activeJobs =
          jobs?.filter((j) => j.status === "open" || j.status === "in_progress")
            .length || 0;
        const workersApplied =
          bookings?.filter((b) => b.status === "pending").length || 0;
        const pendingReviews =
          bookings?.filter((b) => b.status === "completed").length || 0;
        const totalSpent = wallet?.available_balance
          ? Number(wallet.available_balance) +
            Number(wallet.pending_balance || 0)
          : 0;

        setStats({
          activeJobs,
          workersApplied,
          pendingReviews,
          totalSpent,
        });

        // Filter upcoming bookings (accepted and future dates)
        const now = new Date();
        const upcoming = (bookings || [])
          .filter((b) => {
            if (b.status !== "accepted" && b.status !== "in_progress")
              return false;
            if (!b.start_date) return false;
            return new Date(b.start_date) >= now;
          })
          .slice(0, 3);

        setUpcomingBookings(upcoming as Booking[]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const userName = user?.user_metadata?.full_name || "";

  if (authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          {t("common.loading", "Memuat...")}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="animate-slide-up opacity-0 animation-delay-100">
        <DashboardGreeting name={userName} role="business" />
      </div>
      <div className="animate-slide-up opacity-0 animation-delay-200">
        <QuickStats stats={stats} role="business" isLoading={isLoading} />
      </div>
      <div className="animate-slide-up opacity-0 animation-delay-300">
        <QuickActions role="business" />
      </div>
      <div className="animate-slide-up opacity-0 animation-delay-400">
        <UpcomingBookings
          bookings={upcomingBookings}
          role="business"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
