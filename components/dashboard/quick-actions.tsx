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
  MessageSquare
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/hooks";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  primary: boolean;
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
      primary: true,
    },
    {
      label: "Cari Pekerja",
      href: "/business/workers",
      icon: Search,
      primary: false,
    },
    {
      label: "Wallet",
      href: "/business/wallet",
      icon: Wallet,
      primary: false,
    },
    {
      label: "Bookings",
      href: "/business/bookings",
      icon: Calendar,
      primary: false,
    },
    {
      label: "Analytics",
      href: "/business/analytics",
      icon: BarChart3,
      primary: false,
    },
    {
      label: "Reviews",
      href: "/business/reviews",
      icon: Star,
      primary: false,
    },
  ];

  const workerActions: QuickAction[] = [
    {
      label: "Cari Lowongan",
      href: "/worker/jobs",
      icon: Briefcase,
      primary: true,
    },
    {
      label: "Ketersediaan",
      href: "/worker/availability",
      icon: Calendar,
      primary: false,
    },
    {
      label: "Wallet",
      href: "/worker/wallet",
      icon: Wallet,
      primary: false,
    },
    {
      label: "Bookings",
      href: "/worker/bookings",
      icon: Calendar,
      primary: false,
    },
    {
      label: "Earnings",
      href: "/worker/earnings",
      icon: CreditCard,
      primary: false,
    },
    {
      label: "Applications",
      href: "/worker/applications",
      icon: FileText,
      primary: false,
    },
    {
      label: "Badges",
      href: "/worker/badges",
      icon: Award,
      primary: false,
    },
    {
      label: "Attendance",
      href: "/worker/attendance",
      icon: Clock,
      primary: false,
    },
  ];

  const actions = role === "business" ? businessActions : workerActions;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {actions.map((action, i) => (
        <Link
          key={i}
          href={action.href}
          className={cn(
            "group flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-medium transition-all duration-200 touch-manipulation",
            "active:scale-[0.97] hover:shadow-md hover:-translate-y-0.5",
            action.primary
              ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
              : "bg-card border border-border hover:bg-muted hover:border-primary/30"
          )}
        >
          <action.icon className={cn(
            "h-6 w-6",
            action.primary ? "text-white" : "text-muted-foreground group-hover:text-primary"
          )} />
          <span className={cn(
            "text-xs text-center",
            action.primary ? "text-white" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
