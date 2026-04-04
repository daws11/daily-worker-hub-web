"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/app/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Loader2, Trophy, Target, Lock, Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  getWorkerAchievements,
  checkAndAwardBadges,
  type BadgeWithProgress,
} from "@/lib/badges";
import {
  AchievementBadgeGrid,
  AchievementBadgeMiniGrid,
} from "@/components/worker/achievement-badge-grid";
import {
  AchievementBadgeProgress,
  BadgeProgressList,
} from "@/components/worker/achievement-badge-progress";

type WorkersRow = Database["public"]["Tables"]["workers"]["Row"];

export default function WorkerAchievementsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [worker, setWorker] = useState<WorkersRow | null>(null);
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [isLoadingWorker, setIsLoadingWorker] = useState(true);
  const [isLoadingBadges, setIsLoadingBadges] = useState(true);
  const [isCheckingBadges, setIsCheckingBadges] = useState(false);
  const [stats, setStats] = useState<{
    completedJobs: number;
    averageRating: number | null;
    totalReviews: number;
    attendanceRate: number;
  } | null>(null);

  // Fetch worker profile
  useEffect(() => {
    async function fetchWorker() {
      if (!user) {
        router.push("/login");
        return;
      }

      setIsLoadingWorker(true);

      const { data, error } = await (supabase as any)
        .from("workers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        toast.error("Profil worker tidak ditemukan");
        setIsLoadingWorker(false);
        return;
      }

      setWorker(data);
      setIsLoadingWorker(false);
    }

    fetchWorker();
  }, [user, router]);

  // Fetch badges
  useEffect(() => {
    async function fetchBadges() {
      if (!worker) return;

      setIsLoadingBadges(true);
      try {
        const allBadges = await getWorkerAchievements(worker.id);
        setBadges(allBadges);

        // Check for new badges
        setIsCheckingBadges(true);
        const result = await checkAndAwardBadges(worker.id);
        if (result.awarded.length > 0) {
          toast.success(
            `Selamat! Anda mendapatkan ${result.awarded.length} badge baru!`,
          );
          // Refresh badges
          const updatedBadges = await getWorkerAchievements(worker.id);
          setBadges(updatedBadges);
        }
      } catch (error) {
        console.error("Error fetching badges:", error);
      } finally {
        setIsLoadingBadges(false);
        setIsCheckingBadges(false);
      }
    }

    fetchBadges();
  }, [worker]);

  // Calculate stats
  useEffect(() => {
    async function fetchStats() {
      if (!worker) return;

      try {
        // Get completed bookings count
        const { count: completedJobs } = await (supabase as any)
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("worker_id", worker.id)
          .eq("status", "completed");

        // Get reviews
        const { data: reviews } = await (supabase as any)
          .from("reviews")
          .select("rating")
          .eq("worker_id", worker.id);

        const validRatings =
          (reviews as any[])?.filter((r: any) => r.rating !== null).map((r: any) => r.rating) || [];
        const averageRating =
          validRatings.length > 0
            ? validRatings.reduce((a: number, b: number) => a + b, 0) / validRatings.length
            : null;

        // Get attendance
        const { data: bookings } = await (supabase as any)
          .from("bookings")
          .select("id, check_in_at")
          .eq("worker_id", worker.id)
          .eq("status", "completed");

        const completedBookings = (bookings as any[]) || [];
        const bookingsWithCheckIn = completedBookings.filter(
          (b: any) => b.check_in_at,
        );
        const attendanceRate =
          completedBookings.length > 0
            ? Math.round(
                (bookingsWithCheckIn.length / completedBookings.length) * 100,
              )
            : 0;

        setStats({
          completedJobs: completedJobs || 0,
          averageRating,
          totalReviews: validRatings.length,
          attendanceRate,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, [worker]);

  const earnedBadges = badges.filter((b) => b.earned);
  const inProgressBadges = badges.filter(
    (b) => !b.earned && b.progress && b.progress.percentage > 0,
  );
  const lockedBadges = badges.filter(
    (b) => !b.earned && (!b.progress || b.progress.percentage === 0),
  );

  if (isLoadingWorker) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Memuat profil worker...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 pb-24 md:pb-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-yellow-500" />
            Achievement Badges
          </h1>
          <p className="text-muted-foreground">
            Kumpulkan badge dengan menyelesaikan pekerjaan dan mendapatkan
            review positif
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Badge Diperoleh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {earnedBadges.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {badges.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pekerjaan Selesai
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">
                  {stats?.completedJobs || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rating Rata-rata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {stats?.averageRating ? stats.averageRating.toFixed(1) : "-"}
                </span>
                {stats?.totalReviews ? (
                  <span className="text-sm text-muted-foreground">
                    ({stats.totalReviews} reviews)
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tingkat Kehadiran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">
                  {stats?.attendanceRate || 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        {inProgressBadges.length > 0 && (
          <AchievementBadgeProgress
            badges={badges}
            loading={isLoadingBadges}
            className="mb-6"
          />
        )}

        {/* Badges Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all">Semua ({badges.length})</TabsTrigger>
            <TabsTrigger value="earned">
              Diperoleh ({earnedBadges.length})
            </TabsTrigger>
            <TabsTrigger value="progress">
              Dalam Progres ({inProgressBadges.length})
            </TabsTrigger>
          </TabsList>

          {/* All Badges Tab */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Semua Badge
                </CardTitle>
                <CardDescription>
                  Lihat semua achievement badge yang tersedia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AchievementBadgeGrid
                  badges={badges}
                  loading={isLoadingBadges || isCheckingBadges}
                  showProgress={true}
                  showUnearned={true}
                  columns={4}
                  emptyMessage="Belum ada badge"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earned Badges Tab */}
          <TabsContent value="earned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  Badge Diperoleh
                </CardTitle>
                <CardDescription>Badge yang telah kamu peroleh</CardDescription>
              </CardHeader>
              <CardContent>
                <AchievementBadgeGrid
                  badges={earnedBadges}
                  loading={isLoadingBadges}
                  showProgress={false}
                  showUnearned={false}
                  columns={4}
                  emptyMessage="Belum ada badge diperoleh"
                  emptyDescription="Selesaikan pekerjaan untuk mendapatkan badge pertamamu!"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* In Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Dalam Progres
                </CardTitle>
                <CardDescription>Badge yang sedang kamu kejar</CardDescription>
              </CardHeader>
              <CardContent>
                {inProgressBadges.length > 0 ? (
                  <BadgeProgressList
                    badges={inProgressBadges}
                    loading={isLoadingBadges}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Tidak ada badge dalam progres
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Selesaikan pekerjaan untuk memulai progress badge
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Badge Tiers Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Tingkat Badge</CardTitle>
            <CardDescription>
              Badge memiliki tingkat kesulitan yang berbeda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-600" />
                <span className="text-sm">Bronze - Mudah</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-400" />
                <span className="text-sm">Silver - Menengah</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-500" />
                <span className="text-sm">Gold - Sulit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-200 border-2 border-violet-500" />
                <span className="text-sm">Platinum - Sangat Sulit</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
