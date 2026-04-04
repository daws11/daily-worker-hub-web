"use client";

import Link from "next/link";
import { 
  Plus, 
  Search, 
  Calendar, 
  Briefcase,
  Wallet,
  Users,
  BarChart3,
  Star,
  Clock,
  Award,
  CreditCard,
  FileText,
  CheckCircle,
  MessageSquare,
  Activity
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/hooks";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // bg color for icon circle
  iconColor: string; // icon color
}

interface QuickActionsProps {
  role: "business" | "worker";
}

export function QuickActions({ role }: QuickActionsProps) {
  const { t } = useTranslation();

  const businessActions: QuickAction[] = [
    {
      label: "Buat Lowongan",
      href: "/business/jobs/new",
      icon: Plus,
      color: "bg-green-100 dark:bg-green-900/40",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      label: "Cari Pekerja",
      href: "/business/workers",
      icon: Search,
      color: "bg-blue-100 dark:bg-blue-900/40",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Wallet",
      href: "/business/wallet",
      icon: Wallet,
      color: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Bookings",
      href: "/business/bookings",
      icon: Calendar,
      color: "bg-orange-100 dark:bg-orange-900/40",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Dispatch Analytics",
      href: "/business/dispatch-analytics",
      icon: Activity,
      color: "bg-cyan-100 dark:bg-cyan-900/40",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      label: "Analytics",
      href: "/business/analytics",
      icon: BarChart3,
      color: "bg-purple-100 dark:bg-purple-900/40",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Reviews",
      href: "/business/reviews",
      icon: Star,
      color: "bg-yellow-100 dark:bg-yellow-900/40",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
  ];

  const workerActions: QuickAction[] = [
    {
      label: "Cari Lowongan",
      href: "/worker/jobs",
      icon: Briefcase,
      color: "bg-green-100 dark:bg-green-900/40",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      label: "Ketersediaan",
      href: "/worker/availability",
      icon: Calendar,
      color: "bg-blue-100 dark:bg-blue-900/40",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Wallet",
      href: "/worker/wallet",
      icon: Wallet,
      color: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Bookings",
      href: "/worker/bookings",
      icon: Calendar,
      color: "bg-orange-100 dark:bg-orange-900/40",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Earnings",
      href: "/worker/earnings",
      icon: CreditCard,
      color: "bg-teal-100 dark:bg-teal-900/40",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      label: "Applications",
      href: "/worker/applications",
      icon: FileText,
      color: "bg-indigo-100 dark:bg-indigo-900/40",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Badges",
      href: "/worker/badges",
      icon: Award,
      color: "bg-yellow-100 dark:bg-yellow-900/40",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Attendance",
      href: "/worker/attendance",
      icon: Clock,
      color: "bg-pink-100 dark:bg-pink-900/40",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
  ];

  const actions = role === "business" ? businessActions : workerActions;

  return (
    <div className="grid grid-cols-4 gap-4">
      {actions.map((action, i) => (
        <Link
          key={i}
          href={action.href}
          className="group flex flex-col items-center gap-2 touch-manipulation active:scale-95 transition-transform duration-150"
        >
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:shadow-md",
            action.color
          )}>
            <action.icon className={cn("h-7 w-7", action.iconColor)} />
          </div>
          <span className="text-xs text-center text-foreground/80 font-medium leading-tight">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
