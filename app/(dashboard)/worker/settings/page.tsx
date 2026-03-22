"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TierBadgeDetailed } from "@/components/worker/tier-badge";
import { AvailabilitySlots } from "@/components/worker/availability-slots";
import { 
  Settings, 
  Wallet, 
  CalendarCheck, 
  CreditCard, 
  FileText, 
  Award,
  Clock,
  Calendar,
  LogOut, 
  ChevronRight,
  User,
  Bell,
  Lock,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { WorkerTier } from "@/lib/supabase/types";
import { DAY_NAMES } from "@/lib/algorithms/availability-checker";
import { setWorkerAvailabilityForWeek } from "@/lib/algorithms/availability-checker";
import { getUserNotificationPreferences, updateUserNotificationPreferences } from "@/lib/actions/push-notifications";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const workerMenuItems: MenuItem[] = [
  { title: "Profil", href: "/worker/profile", icon: User, description: "Informasi profil Anda" },
  { title: "Wallet", href: "/worker/wallet", icon: Wallet, description: "Saldo dan earnings" },
  { title: "Bookings", href: "/worker/bookings", icon: CalendarCheck, description: "Riwayat booking" },
  { title: "Earnings", href: "/worker/earnings", icon: CreditCard, description: "Pendapatan" },
  { title: "Applications", href: "/worker/applications", icon: FileText, description: "Lamaran kerja" },
  { title: "Badges", href: "/worker/badges", icon: Award, description: "Badge & pencapaian" },
  { title: "Attendance", href: "/worker/attendance", icon: Clock, description: "Riwayat absensi" },
  { title: "Availability", href: "/worker/availability", icon: Calendar, description: "Atur ketersediaan" },
];

const bottomMenuItems: MenuItem[] = [
  { title: "Notifikasi", href: "/worker/settings?tab=notifications", icon: Bell },
  { title: "Keamanan", href: "/worker/settings?tab=security", icon: Lock },
  { title: "Bantuan", href: "/worker/settings?tab=help", icon: HelpCircle },
  { title: "Kebijakan", href: "/worker/settings?tab=policy", icon: ExternalLink },
];

interface AvailabilitySlot {
  dayOfWeek: number;
  dayName: string;
  isAvailable: boolean;
  startHour: number;
  endHour: number;
}

export default function WorkerSettingsPage() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // Worker data state
  const [workerData, setWorkerData] = useState<{
    tier: WorkerTier;
    jobsCompleted: number;
    rating: number | null;
  } | null>(null);

  // Availability state
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([
    { dayOfWeek: 1, dayName: "Monday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 2, dayName: "Tuesday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 3, dayName: "Wednesday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 4, dayName: "Thursday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 5, dayName: "Friday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 6, dayName: "Saturday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 7, dayName: "Sunday", isAvailable: false, startHour: 9, endHour: 17 },
  ]);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Fetch worker data
        const { data: worker } = await supabase
          .from("workers")
          .select("id, tier, jobs_completed, rating")
          .eq("user_id", user.id)
          .single();

        if (worker) {
          setWorkerData({
            tier: worker.tier as WorkerTier,
            jobsCompleted: (worker as any).jobs_completed || 0,
            rating: worker.rating,
          });

          // Fetch availability
          const { data: availability } = await supabase
            .from("worker_availabilities")
            .select("*")
            .eq("worker_id", worker.id)
            .order("day_of_week");

          if (availability && availability.length > 0) {
            setAvailabilitySlots(availability.map((av: any) => ({
              dayOfWeek: av.day_of_week,
              dayName: DAY_NAMES[av.day_of_week],
              isAvailable: av.is_available,
              startHour: av.start_hour,
              endHour: av.end_hour,
            })));
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const name = user.user_metadata.full_name as string;
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Berhasil logout");
  };

  const handleAvailabilityToggle = (dayOfWeek: number) => {
    setAvailabilitySlots((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, isAvailable: !slot.isAvailable } : slot
      ),
    );
  };

  const handleAvailabilitySave = async () => {
    if (!workerData) return;
    setIsSavingAvailability(true);

    try {
      const result = await setWorkerAvailabilityForWeek(
        user?.id!,
        availabilitySlots.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startHour: slot.startHour,
          endHour: slot.endHour,
          isAvailable: slot.isAvailable,
        })),
      );

      if (result.success) {
        toast.success("Ketersediaan berhasil disimpan");
      } else {
        toast.error(result.errors?.join(", ") || "Gagal menyimpan");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Gagal menyimpan");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Profile Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-white/20">
                  <AvatarImage src={user?.user_metadata?.avatar_url as string} />
                  <AvatarFallback className="text-xl bg-white/20 text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">
                    {user?.user_metadata?.full_name as string || "User"}
                  </h2>
                  <p className="text-sm text-white/80">{user?.email}</p>
                  {workerData && (
                    <div className="flex items-center gap-2 mt-1">
                      <TierBadgeDetailed
                        tier={workerData.tier}
                        jobsCompleted={workerData.jobsCompleted}
                        rating={workerData.rating ?? undefined}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Availability Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Ketersediaan Mingguan</p>
                <p className="text-xs text-muted-foreground">Atur hari dan jam kerja</p>
              </div>
              <Button 
                size="sm" 
                onClick={handleAvailabilitySave}
                disabled={isSavingAvailability}
              >
                {isSavingAvailability ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {availabilitySlots.slice(0, 7).map((slot) => (
                <button
                  key={slot.dayOfWeek}
                  onClick={() => handleAvailabilityToggle(slot.dayOfWeek)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    slot.isAvailable 
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {slot.dayName.slice(0, 3)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Menu */}
        <Card>
          <CardContent className="p-2">
            {workerMenuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Bottom Menu */}
        <Card>
          <CardContent className="p-2">
            {bottomMenuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  href={item.href}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">{item.title}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full justify-start gap-3 h-12"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
