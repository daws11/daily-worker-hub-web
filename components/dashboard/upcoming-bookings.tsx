"use client";

import Link from "next/link";
import { Calendar, MapPin, Clock, Phone, MessageSquare, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/hooks";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  workers?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
  businesses?: {
    id: string;
    name: string;
  } | null;
}

interface UpcomingBookingsProps {
  bookings: Booking[];
  role: "business" | "worker";
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  pending: {
    label: "Menunggu",
    className:
      "bg-amber-100/80 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30",
    dot: "bg-amber-500",
  },
  accepted: {
    label: "Diterima",
    className:
      "bg-blue-100/80 text-blue-700 border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "Berlangsung",
    className:
      "bg-green-100/80 text-green-700 border-green-200/50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30",
    dot: "bg-green-500 animate-pulse",
  },
  completed: {
    label: "Selesai",
    className:
      "bg-gray-100/80 text-gray-700 border-gray-200/50 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700/30",
    dot: "bg-gray-400",
  },
  cancelled: {
    label: "Dibatalkan",
    className:
      "bg-red-100/80 text-red-700 border-red-200/50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30",
    dot: "bg-red-500",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `Rp${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `Rp${(value / 1000).toFixed(0)}K`;
  }
  return `Rp${value}`;
}

function formatBookingDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hari ini, ${format(date, "HH:mm")}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Besok, ${format(date, "HH:mm")}`;
    }
    return format(date, "d MMM, HH:mm", { locale: id });
  } catch {
    return "-";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = getInitials(name);
  
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-10 h-10 rounded-full object-cover ring-2 ring-background"
      />
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-sm font-semibold ring-2 ring-background">
      {initials}
    </div>
  );
}

function BookingCard({ booking, role }: { booking: Booking; role: "business" | "worker" }) {
  const name =
    role === "business"
      ? booking.workers?.full_name || "Pekerja"
      : booking.businesses?.name || "Perusahaan";
  const jobTitle = booking.jobs?.title || "Pekerjaan";
  const address = booking.jobs?.address;
  const price = booking.final_price;
  const avatarUrl = role === "business" ? booking.workers?.avatar_url : undefined;

  return (
    <div className="group p-4 bg-card rounded-xl border border-border hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 touch-manipulation">
      <div className="flex items-start gap-3">
        {role === "business" && (
          <Avatar name={name} avatarUrl={avatarUrl} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold truncate">{name}</h3>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground truncate">{jobTitle}</p>
        </div>
        {price != null && (
          <p className="text-sm font-bold text-primary whitespace-nowrap">
            {formatCurrency(price)}
          </p>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary/60" />
          <span>{formatBookingDate(booking.start_date)}</span>
        </div>
        {address && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary/60" />
            <span className="truncate">{address}</span>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs gap-1.5 touch-manipulation"
        >
          <Phone className="h-3.5 w-3.5" />
          Hubungi
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs gap-1.5 touch-manipulation"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Chat
        </Button>
        <Link
          href={role === "business" ? `/business/bookings/${booking.id}` : `/worker/bookings/${booking.id}`}
          className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline touch-manipulation"
        >
          Detail
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="p-4 bg-card rounded-xl border border-border animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-muted rounded mb-1" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="h-5 w-16 bg-muted rounded" />
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="h-3 w-36 bg-muted rounded" />
      </div>
    </div>
  );
}

export function UpcomingBookings({
  bookings,
  role,
  isLoading,
}: UpcomingBookingsProps) {
  const { t } = useTranslation();
  const viewAllHref = role === "business" ? "/business/bookings" : "/worker/bookings";
  const upcomingCount = bookings.length;

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {t("dashboard.upcomingBookings")}
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {t("dashboard.upcomingBookings")}
          </h2>
          <Link
            href={viewAllHref}
            className="text-sm text-primary hover:underline"
          >
            {t("common.viewAll")} →
          </Link>
        </div>
        <div className="p-8 bg-card rounded-xl border border-border text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-7 w-7 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">
            {t("dashboard.noUpcomingBookings")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "business"
              ? t("dashboard.createJobHint")
              : t("dashboard.findJobsHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {t("dashboard.upcomingBookings")} 
          <span className="ml-2 text-sm font-normal text-muted-foreground">({upcomingCount})</span>
        </h2>
        <Link
          href={viewAllHref}
          className="text-sm text-primary hover:underline flex items-center gap-1 touch-manipulation"
        >
          {t("common.viewAll")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="space-y-3">
        {bookings.slice(0, 3).map((booking) => (
          <BookingCard key={booking.id} booking={booking} role={role} />
        ))}
      </div>
    </div>
  );
}
