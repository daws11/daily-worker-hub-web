"use client";

import Link from "next/link";
import { Calendar, MapPin, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n/hooks";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Menunggu",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  },
  accepted: {
    label: "Diterima",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  in_progress: {
    label: "Berlangsung",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
  completed: {
    label: "Selesai",
    className:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400",
  },
  cancelled: {
    label: "Dibatalkan",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className
      )}
    >
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

function BookingCard({ booking, role }: { booking: Booking; role: "business" | "worker" }) {
  const name =
    role === "business"
      ? booking.workers?.full_name || "Pekerja"
      : booking.businesses?.name || "Perusahaan";
  const jobTitle = booking.jobs?.title || "Pekerjaan";
  const address = booking.jobs?.address;
  const price = booking.final_price;

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{name}</h3>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">{jobTitle}</p>
        </div>
        {price != null && (
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(price)}
          </p>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatBookingDate(booking.start_date)}</span>
        </div>
        {address && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{address}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="p-4 bg-card rounded-lg border border-border animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 w-32 bg-muted rounded mb-1" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="h-5 w-16 bg-muted rounded" />
      </div>
      <div className="mt-3 space-y-1">
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
            {t("dashboard.upcomingBookings", "Booking Mendatang")}
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
            {t("dashboard.upcomingBookings", "Booking Mendatang")}
          </h2>
          <Link
            href={viewAllHref}
            className="text-sm text-primary hover:underline"
          >
            {t("common.viewAll", "Lihat Semua")} →
          </Link>
        </div>
        <div className="p-6 bg-card rounded-lg border border-border text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {t("dashboard.noUpcomingBookings", "Belum ada booking mendatang")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "business"
              ? t("dashboard.createJobHint", "Buat pekerjaan baru untuk mencari pekerja")
              : t("dashboard.findJobsHint", "Cari pekerjaan yang tersedia")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {t("dashboard.upcomingBookings", "Booking Mendatang")} ({upcomingCount})
        </h2>
        <Link
          href={viewAllHref}
          className="text-sm text-primary hover:underline"
        >
          {t("common.viewAll", "Lihat Semua")} →
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
