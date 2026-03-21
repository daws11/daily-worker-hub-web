"use client";

import { useTranslation } from "@/lib/i18n/hooks";
import { Sunrise, Sun, Moon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardGreetingProps {
  name: string;
  role: "business" | "worker";
}

function getTimeBasedGreeting(hour: number): {
  greeting: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
} {
  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Selamat Pagi",
      icon: Sunrise,
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: "Selamat Siang",
      icon: Sun,
      gradient: "from-yellow-500 to-amber-500",
      iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      greeting: "Selamat Sore",
      icon: Sun,
      gradient: "from-orange-500 to-rose-500",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
    };
  } else {
    return {
      greeting: "Selamat Malam",
      icon: Moon,
      gradient: "from-indigo-500 to-purple-500",
      iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    };
  }
}

export function DashboardGreeting({ name, role }: DashboardGreetingProps) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const { greeting, icon: TimeIcon, gradient, iconBg } = getTimeBasedGreeting(hour);
  
  const subtitle =
    role === "business"
      ? t("dashboard.readyToFindWorkers", "Siap mencari pekerja untuk hari ini?")
      : t("dashboard.newJobOpportunities", "Ada peluang kerja baru untuk Anda!");

  const displayName = name || (role === "business" ? "Pengusaha" : "Pekerja");

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-start gap-4">
        {/* Time-based icon */}
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl shrink-0",
          iconBg
        )}>
          <TimeIcon className={cn("w-6 h-6 bg-gradient-to-r bg-clip-text text-transparent", gradient)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {greeting},
            </span>{" "}
            <span className={cn("bg-gradient-to-r bg-clip-text text-transparent font-extrabold", gradient)}>
              {displayName}!
            </span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary/60" />
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
