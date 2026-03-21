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
    },
    {
      label: t("actions.findWorkers", "Cari Pekerja"),
      href: "/business/workers",
      icon: Search,
      primary: false,
    },
  ];

  const workerActions: QuickAction[] = [
    {
      label: t("actions.findJobs", "Cari Pekerjaan"),
      href: "/worker/jobs",
      icon: Briefcase,
      primary: true,
    },
    {
      label: t("actions.setAvailability", "Atur Ketersediaan"),
      href: "/worker/availability",
      icon: Calendar,
      primary: false,
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
            "flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 active:scale-[0.98]",
            action.primary
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md"
              : "bg-card border border-border hover:bg-muted hover:shadow-md"
          )}
        >
          <action.icon className="h-5 w-5" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}
