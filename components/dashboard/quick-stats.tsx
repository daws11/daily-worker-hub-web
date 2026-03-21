"use client";

import Link from "next/link";
import {
  Briefcase,
  Users,
  Star,
  Wallet,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
  href?: string;
}

function StatCard({ label, value, icon: Icon, trend, href }: StatCardProps) {
  const content = (
    <div
      className={cn(
        "p-4 bg-card rounded-lg border border-border transition-shadow",
        href && "hover:shadow-md cursor-pointer"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {trend && (
        <p
          className={cn(
            "text-xs mt-1",
            trend.value >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {trend.value >= 0 ? "+" : ""}
          {trend.value}% {trend.label}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

// Business stats type
interface BusinessStats {
  activeJobs: number;
  workersApplied: number;
  pendingReviews: number;
  totalSpent: number;
}

// Worker stats type
interface WorkerStats {
  openJobs: number;
  activeBookings: number;
  earnedThisMonth: number;
  rating: number;
}

interface QuickStatsProps {
  stats: BusinessStats | WorkerStats | null;
  role: "business" | "worker";
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `Rp${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `Rp${(value / 1000).toFixed(0)}K`;
  }
  return `Rp${value}`;
}

export function QuickStats({ stats, role, isLoading }: QuickStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-card rounded-lg border border-border animate-pulse"
          >
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (role === "business") {
    const businessStats = stats as BusinessStats | null;
    const cards: StatCardProps[] = [
      {
        label: "Pekerjaan Aktif",
        value: businessStats?.activeJobs ?? 0,
        icon: Briefcase,
        href: "/business/jobs",
      },
      {
        label: "Pekerja Melamar",
        value: businessStats?.workersApplied ?? 0,
        icon: Users,
        href: "/business/bookings",
      },
      {
        label: "Perlu Review",
        value: businessStats?.pendingReviews ?? 0,
        icon: Star,
        href: "/business/reviews",
      },
      {
        label: "Total Dikeluarkan",
        value: formatCurrency(businessStats?.totalSpent ?? 0),
        icon: Wallet,
        href: "/business/wallet",
      },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>
    );
  }

  // Worker stats
  const workerStats = stats as WorkerStats | null;
  const cards: StatCardProps[] = [
    {
      label: "Lowongan Tersedia",
      value: workerStats?.openJobs ?? 0,
      icon: Briefcase,
      href: "/worker/jobs",
    },
    {
      label: "Booking Aktif",
      value: workerStats?.activeBookings ?? 0,
      icon: CalendarCheck,
      href: "/worker/bookings",
    },
    {
      label: "Pendapatan Bulan Ini",
      value: formatCurrency(workerStats?.earnedThisMonth ?? 0),
      icon: TrendingUp,
      href: "/worker/earnings",
    },
    {
      label: "Rating",
      value: workerStats?.rating ? workerStats.rating.toFixed(1) : "-",
      icon: Star,
      href: "/worker/profile",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    {cards.map((card, i) => (
        <StatCard key={i} {...card} />
      ))}
    </div>
  );
}

export type { BusinessStats, WorkerStats };
