"use client";

import * as React from "react";
import { useCallback } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import type { ReviewerType } from "@/lib/schemas/review";
import {
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Plus,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ReviewFormDialog = dynamic(
  () =>
    import("@/components/review/review-form-dialog").then((mod) => ({
      default: mod.ReviewFormDialog,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    ),
    ssr: false,
  },
);

interface BookingWorker {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
}

interface BookingJob {
  id: string;
  title: string;
  description: string;
  address: string | null;
}

interface Booking {
  id: string;
  job_id: string;
  worker_id: string;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "in_progress"
    | "completed"
    | "cancelled";
  start_date: string;
  end_date: string;
  final_price: number;
  created_at: string;
  worker?: BookingWorker;
  job?: BookingJob;
}

interface BookingReview {
  id: string;
  rating: number;
  comment: string | null;
  would_rehire: boolean | null;
}


type BookingStatusGroup = {
  pending: Booking[];
  accepted: Booking[];
  completed: Booking[];
  cancelled: Booking[];
};

const statusGroupLabels: Record<keyof BookingStatusGroup, string> = {
  pending: "Pending Bookings",
  accepted: "Accepted & In Progress",
  completed: "Completed - Ready for Review",
  cancelled: "Cancelled",
};

function groupBookingsByStatus(bookings: Booking[]): BookingStatusGroup {
  return bookings.reduce<BookingStatusGroup>(
    (groups, booking) => {
      if (booking.status === "pending") {
        groups.pending.push(booking);
      } else if (
        booking.status === "accepted" ||
        booking.status === "in_progress"
      ) {
        groups.accepted.push(booking);
      } else if (booking.status === "completed") {
        groups.completed.push(booking);
      } else if (
        booking.status === "cancelled" ||
        booking.status === "rejected"
      ) {
        groups.cancelled.push(booking);
      }
      return groups;
    },
    { pending: [], accepted: [], completed: [], cancelled: [] },
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function BusinessBookingsPage() {
  const { signOut, user, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bookingReviews, setBookingReviews] = React.useState<
    Map<string, BookingReview>
  >(new Map());
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(
    null,
  );
  const [businessId, setBusinessId] = React.useState<string | null>(null);

  const fetchBookingsWithReviews = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all bookings for the business
      const { data: bookingsData, error: bookingsError } = await (supabase as any)
        .from("bookings")
        .select(
          `
          id,
          job_id,
          worker_id,
          status,
          start_date,
          end_date,
          final_price,
          created_at,
          worker:workers(
            id,
            full_name,
            phone,
            avatar_url
          ),
          job:jobs(
            id,
            title,
            description,
            address
          )
        `,
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      const bookings = (bookingsData as unknown as Booking[]) || [];

      // Fetch existing reviews for completed bookings
      const completedBookingIds: string[] = (bookings as any[])
        .filter((b: any) => b.status === "completed")
        .map((b: any) => b.id);

      if (completedBookingIds.length > 0) {
        const { data: reviewsData } = await (supabase as any)
          .from("reviews")
          .select("id, booking_id, rating, comment, would_rehire")
          .in("booking_id", completedBookingIds as any[])
          .eq("reviewer", "business");

        const reviewsMap = new Map<string, BookingReview>();
        reviewsData?.forEach((review: any) => {
          reviewsMap.set(review.booking_id, {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            would_rehire: review.would_rehire,
          });
        });

        setBookingReviews(reviewsMap);
      }

      setBookings(bookings);
    } catch (err: any) {
      const message =
        err.message ||
        "Gagal memuat data booking / Failed to load booking data";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // Fetch bookings on mount and when businessId is available
  React.useEffect(() => {
    if (businessId) {
      fetchBookingsWithReviews();
    }
  }, [businessId, fetchBookingsWithReviews]);

  // Look up business profile to get business ID
  React.useEffect(() => {
    async function lookupBusiness() {
      if (!user?.id) return;

      const { data: business } = await (supabase as any)
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (business) {
        setBusinessId(business.id);
      }
    }

    lookupBusiness();
  }, [user?.id, supabase]);

  const handleLogout = async () => {
    await signOut();
  };

  const handleWriteReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleReviewSuccess = () => {
    setReviewDialogOpen(false);
    setSelectedBooking(null);
    // Refresh bookings to update review status
    fetchBookingsWithReviews();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-destructive font-medium">
            Error: Tidak dapat memuat informasi pengguna. Silakan refresh
            halaman.
          </p>
        </div>
      </div>
    );
  }

  const groupedBookings = groupBookingsByStatus(bookings);
  const hasBookings = Object.values(groupedBookings).some(
    (group) => group.length > 0,
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Booking Bisnis</h1>
          <p className="text-muted-foreground text-sm m-0">
            Kelola booking pekerja dan berikan ulasan
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={authLoading}
          className="px-4 py-2.5 bg-destructive text-primary-foreground border-none rounded-md font-medium text-sm cursor-not-allowed opacity-60 transition-colors disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
        >
          {authLoading ? "Memproses..." : "Keluar"}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div className="flex-1">
            <p className="text-destructive font-medium mb-1">
              Gagal memuat data
            </p>
            <p className="text-destructive text-sm">{error}</p>
          </div>
          <button
            onClick={fetchBookingsWithReviews}
            className="px-4 py-2.5 bg-destructive text-primary-foreground border-none rounded-md text-sm font-medium cursor-pointer flex items-center gap-2 min-h-[44px] touch-manipulation"
          >
            <Loader2 className="w-4 h-4" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="bg-card dark:bg-card rounded-lg p-12 shadow-sm text-center">
          <Loader2 className="animate-spin w-8 h-8 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data booking...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !hasBookings && (
        <div className="bg-card dark:bg-card rounded-lg p-12 shadow-sm text-center border border-dashed border-border">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Belum Ada Booking</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Booking pekerja akan muncul di sini setelah pekerja melamar pada
              pekerjaan yang Anda buat. Mulai dengan membuat pekerjaan baru.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/business/jobs/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-primary/90 shadow-sm hover:shadow-md min-h-[44px] touch-manipulation"
              >
                <Plus className="w-5 h-5" />
                Buat Pekerjaan Baru
              </Link>
              <Link
                href="/business/jobs"
                className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-foreground border border-border rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted/80 min-h-[44px] touch-manipulation"
              >
                <Calendar className="w-5 h-5" />
                Lihat Pekerjaan Saya
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bookings List */}
      {!isLoading && !error && hasBookings && (
        <div className="flex flex-col gap-8">
          {(
            Object.keys(groupedBookings) as Array<keyof BookingStatusGroup>
          ).map((status) => {
            const groupBookings = groupedBookings[status];
            if (groupBookings.length === 0) return null;

            return (
              <div key={status} className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold">
                  {statusGroupLabels[status]} ({groupBookings.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
                  {groupBookings.map((booking) => {
                    const existingReview = bookingReviews.get(booking.id);
                    return (
                      <div
                        key={booking.id}
                        className="bg-card dark:bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-all"
                      >
                        {/* Worker Info Header */}
                        <div className="px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {booking.worker?.avatar_url ? (
                                <img
                                  src={booking.worker.avatar_url}
                                  alt={booking.worker.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs md:text-sm font-semibold text-muted-foreground">
                                  {getInitials(
                                    booking.worker?.full_name || "?",
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs md:text-sm m-0 whitespace-nowrap overflow-hidden text-ellipsis">
                                {booking.worker?.full_name || "Pekerja"}
                              </p>
                              <p className="text-xs text-muted-foreground m-0 truncate">
                                {booking.worker?.phone || ""}
                              </p>
                            </div>
                            {booking.status === "completed" ? (
                              <div className="px-2 py-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Selesai
                              </div>
                            ) : booking.status === "accepted" ||
                              booking.status === "in_progress" ? (
                              <div className="px-2 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0">
                                <Clock className="w-3.5 h-3.5" />
                                {booking.status === "accepted"
                                  ? "Diterima"
                                  : "Bekerja"}
                              </div>
                            ) : (
                              <div className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium flex-shrink-0">
                                {booking.status === "pending"
                                  ? "Menunggu"
                                  : booking.status}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Job Details */}
                        <div className="p-4">
                          <h3 className="text-base font-semibold mb-2">
                            {booking.job?.title || "Unknown Job"}
                          </h3>

                          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Tanggal:</span>
                              <span>{formatDate(booking.start_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Waktu:</span>
                              <span>
                                {formatTime(booking.start_date)} -{" "}
                                {formatTime(booking.end_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Gaji:</span>
                              <span className="font-semibold text-primary">
                                {formatPrice(booking.final_price)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Review Section - Only for completed bookings */}
                        {booking.status === "completed" && (
                          <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                            {hasReviewed ? (
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm text-muted-foreground">
                                  Ulasan diberikan ({existingReview.rating}/5)
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleWriteReview(booking)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-primary/90 min-h-[44px] touch-manipulation"
                              >
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                Tulis Ulasan
                              </button>
                            )}
                          </div>
                        )}

                        {/* Interview section removed - dispatch flow is primary */}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Form Dialog */}
      {selectedBooking && businessId && (
        <ReviewFormDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          bookingId={selectedBooking.id}
          workerId={selectedBooking.worker_id}
          businessId={businessId}
          reviewer="business"
          targetName={selectedBooking.worker?.full_name || "Pekerja"}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
