"use client";

import Link from "next/link";
import { Plus, Search, Calendar, Briefcase } from "lucide-react";
import { useTranslation } from "@/lib/i18n/hooks";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  primary: boolean;
  gradient?: string;
  iconBg?: string;
}

interface QuickActionsProps {
  role: "business" | "worker";
}

export function QuickActions({ role }: QuickActionsProps) {
  const { t } = useTranslation();

  const businessActions: QuickAction[] = [
    {
      label: t("actions.postJob", "Buat Pekerjaan"),
      href: "/business/jobs/new",
      icon: Plus,
      primary: true,
      gradient: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600",
      iconBg: "bg-white/20",
    },
    {
      label: t("actions.findWorkers", "Cari Pekerja"),
      href: "/business/workers",
      icon: Search,
      primary: false,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
    },
  ];

  const workerActions: QuickAction[] = [
    {
      label: t("actions.findJobs", "Cari Pekerjaan"),
      href: "/worker/jobs",
      icon: Briefcase,
      primary: true,
      gradient: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600",
      iconBg: "bg-white/20",
    },
    {
      label: t("actions.setAvailability", "Atur Ketersediaan"),
      href: "/worker/availability",
      icon: Calendar,
      primary: false,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
    },
  ];

  const actions = role === "business" ? businessActions : workerActions;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {actions.map((action, i) => (
        <Link
          key={i}
          href={action.href}
          className={cn(
            "group flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-200 touch-manipulation",
            "active:scale-[0.97] hover:shadow-lg hover:-translate-y-0.5",
            action.primary
              ? cn(
                  action.gradient,
                  "text-white shadow-md shadow-primary/25"
                )
              : "bg-card border border-border hover:bg-muted hover:border-primary/30"
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-transform duration-200 group-hover:scale-110",
              action.primary
                ? "bg-white/20"
                : action.iconBg
            )}
          >
            <action.icon className="h-5 w-5" />
          </span>
          <span className="text-sm">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
