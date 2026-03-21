"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { DashboardGreeting } from "@/components/dashboard/greeting";
import { QuickStats, type WorkerStats } from "@/components/dashboard/quick-stats";
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
  businesses?: {
    id: string;
    name: string;
  } | null;
}

export default function WorkerDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Get worker profile for this user
        const { data: worker, error: workerError } = await supabase
          .from("workers")
          .select("id, rating")
          .eq("user_id", user.id)
          .single();

        // Fetch available jobs count
        const { count: openJobs, error: jobsError } = await supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("status", "open");

        if (jobsError) {
          console.error("Failed to fetch jobs count:", jobsError);
        }

        // Fetch bookings for this worker
        let bookingsQuery = supabase
          .from("bookings")
          .select(
            `
            id,
            status,
            start_date,
            end_date,
            final_price,
            jobs (id, title, address),
            businesses (id, name)
          `
          );

        if (worker?.id) {
          bookingsQuery = bookingsQuery.eq("worker_id", worker.id);
        } else {
          // If no worker profile, try by user_id
          bookingsQuery = bookingsQuery.eq("worker_id", user.id);
        }

        const { data: bookings, error: bookingsError } = await bookingsQuery.order(
          "start_date",
          { ascending: true }
        );

        if (bookingsError) {
          console.error("Failed to fetch bookings:", bookingsError);
        }

        // Fetch earnings for this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let earningsQuery = supabase
          .from("bookings")
          .select("final_price")
          .eq("status", "completed")
          .gte("created_at", startOfMonth.toISOString());

        if (worker?.id) {
          earningsQuery = earningsQuery.eq("worker_id", worker.id);
        } else {
          earningsQuery = earningsQuery.eq("worker_id", user.id);
        }

        const { data: completedBookings, error: earningsError } = await earningsQuery;

        if (earningsError) {
          console.error("Failed to fetch earnings:", earningsError);
        }

        // Calculate stats
        const activeBookings =
          (bookings || []).filter(
            (b) => b.status === "accepted" || b.status === "in_progress"
          ).length || 0;

        const earnedThisMonth =
          completedBookings?.reduce(
            (sum, b) => sum + (b.final_price || 0),
            0
          ) || 0;

        const rating = worker?.rating || 0;

        setStats({
          openJobs: openJobs || 0,
          activeBookings,
          earnedThisMonth,
          rating,
        });

        // Filter upcoming bookings (accepted and future dates)
        const today = new Date();
        const upcoming = (bookings || [])
          .filter((b) => {
            if (b.status !== "accepted" && b.status !== "in_progress")
              return false;
            if (!b.start_date) return false;
            return new Date(b.start_date) >= today;
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
        <DashboardGreeting name={userName} role="worker" />
      </div>
      <div className="animate-slide-up opacity-0 animation-delay-200">
        <QuickStats stats={stats} role="worker" isLoading={isLoading} />
      </div>
      <div className="animate-slide-up opacity-0 animation-delay-300">
        <QuickActions role="worker" />
      </div>
      <div className="animate-slide-up opacity-0 animation-delay-400">
        <UpcomingBookings
          bookings={upcomingBookings}
          role="worker"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
