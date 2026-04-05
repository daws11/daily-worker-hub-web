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
import { Button } from "@/components/ui/button";
import {
  User,
  Loader2,
  MapPin,
  Phone,
  Calendar,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { getWorkerEarnedBadges, type BadgeWithProgress } from "@/lib/badges";
import { AchievementBadgeMiniGrid } from "@/components/worker/achievement-badge-grid";

type WorkersRow = Database["public"]["Tables"]["workers"]["Row"];

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [worker, setWorker] = useState<WorkersRow | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<BadgeWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    completedJobs: 0,
    averageRating: null as number | null,
    totalReviews: 0,
  });

  // Fetch worker profile
  useEffect(() => {
    async function fetchWorker() {
      if (!user) {
        router.push("/login");
        return;
      }

      setIsLoading(true);

      const { data, error } = await (supabase as any)
        .from("workers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        toast.error("Profil worker tidak ditemukan");
        setIsLoading(false);
        return;
      }

      setWorker(data);

      // Fetch earned badges
      try {
        const badges = await getWorkerEarnedBadges(data.id);
        setEarnedBadges(badges);
      } catch (error) {
        console.error("Error fetching badges:", error);
      }

      // Fetch stats
      const { count: completedJobs } = await (supabase as any)
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("worker_id", data.id)
        .eq("status", "completed");

      const { data: reviews } = await (supabase as any)
        .from("reviews")
        .select("rating")
        .eq("worker_id", data.id);

      const validRatings =
        (reviews as any[])?.filter((r: any) => r.rating !== null).map((r: any) => r.rating) || [];
      const averageRating =
        validRatings.length > 0
          ? validRatings.reduce((a: number, b: number) => a + b, 0) / validRatings.length
          : null;

      setStats({
        completedJobs: completedJobs || 0,
        averageRating,
        totalReviews: validRatings.length,
      });

      setIsLoading(false);
    }

    fetchWorker();
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Profil tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 pb-24 md:pb-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Profil Saya</h1>
          <p className="text-muted-foreground">
            Kelola profil dan lihat pencapaian Anda
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                {worker.avatar_url ? (
                  <img
                    src={worker.avatar_url}
                    alt={worker.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{worker.full_name}</CardTitle>
                <CardDescription className="mt-1">
                  Worker sejak{" "}
                  {new Date(worker.created_at).toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/worker/settings")}
              >
                Edit Profil
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {worker.location_name && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{worker.location_name}</span>
              </div>
            )}
            {worker.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{worker.phone}</span>
              </div>
            )}
            {worker.bio && (
              <p className="text-sm text-muted-foreground">{worker.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.completedJobs}</p>
                <p className="text-sm text-muted-foreground">
                  Pekerjaan Selesai
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {stats.averageRating ? stats.averageRating.toFixed(1) : "-"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Rating ({stats.totalReviews} reviews)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{earnedBadges.length}</p>
                <p className="text-sm text-muted-foreground">Badge Diperoleh</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Badges Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">Achievement Badges</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/worker/badges")}
              >
                Lihat Semua
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <CardDescription>
              Badge yang telah kamu peroleh dari pencapaian
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnedBadges.length > 0 ? (
              <AchievementBadgeMiniGrid
                badges={earnedBadges}
                maxDisplay={8}
                size="md"
              />
            ) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Belum ada badge diperoleh
                </p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => router.push("/worker/badges")}
                >
                  Lihat badge yang tersedia
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
