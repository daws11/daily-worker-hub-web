"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { useTranslation } from "@/lib/i18n/hooks";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getBusinessJobs } from "@/lib/supabase/queries/jobs";
import { getJobBookings } from "@/lib/supabase/queries/bookings";
import type { JobsRow } from "@/lib/supabase/queries/jobs";
import type { JobBookingWithDetails } from "@/lib/supabase/queries/bookings";
import dynamic from "next/dynamic";

const QRCodeGenerator = dynamic(
  () =>
    import("@/components/attendance/qr-code-generator").then((mod) => ({
      default: mod.QRCodeGenerator,
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
import {
  Calendar,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  QrCode,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface JobWithAttendance extends JobsRow {
  bookings?: JobBookingWithDetails[];
  stats?: {
    total: number;
    checkedIn: number;
    checkedOut: number;
  };
  qr_code?: string | null;
}

interface JobsData {
  total: number;
  active: number;
  completed: number;
  jobsList: JobWithAttendance[];
}

export default function BusinessJobsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [jobs, setJobs] = useState<JobsData>({
    total: 0,
    active: 0,
    completed: 0,
    jobsList: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch business jobs with attendance data
  const fetchJobsWithAttendance = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all jobs for the business
      const businessJobs = await getBusinessJobs(user.id);

      // Calculate stats
      const totalJobs = businessJobs.length;
      const activeJobs = businessJobs.filter(
        (job) => job.status === "open" || job.status === "in_progress",
      ).length;
      const completedJobs = businessJobs.filter(
        (job) => job.status === "completed",
      ).length;

      // Fetch bookings for active jobs
      const activeJobsList = businessJobs.filter(
        (job) => job.status === "open" || job.status === "in_progress",
      );

      const jobsWithAttendance: JobWithAttendance[] = await Promise.all(
        activeJobsList.map(async (job) => {
          const { data: bookings } = await getJobBookings(job.id);

          const stats = {
            total: bookings?.length ?? 0,
            checkedIn: bookings?.filter((b) => b.check_in_at).length ?? 0,
            checkedOut: bookings?.filter((b) => b.check_out_at).length ?? 0,
          };

          return {
            ...job,
            bookings: bookings ?? undefined,
            stats,
          };
        }),
      );

      setJobs({
        total: totalJobs,
        active: activeJobs,
        completed: completedJobs,
        jobsList: jobsWithAttendance,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.loadFailed");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  // Handle QR code refresh
  const handleQRRefresh = useCallback(() => {
    fetchJobsWithAttendance();
  }, [fetchJobsWithAttendance]);

  // Format date to current locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === "id" ? "id-ID" : "en-US",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    );
  };

  // Format time to current locale
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString(
      locale === "id" ? "id-ID" : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  };

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobsWithAttendance();
  }, [fetchJobsWithAttendance]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("business.jobsPageTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("business.jobsPageSubtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            window.location.href = "/business/jobs/new";
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors whitespace-nowrap hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Create New Job
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-200 font-medium mb-1">
              {t("errors.loadFailed")}
            </p>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchJobsWithAttendance}
            className="px-4 py-2 bg-red-600 text-white border-none rounded-md text-sm font-medium cursor-pointer flex items-center gap-2 hover:bg-red-700"
          >
            <Loader2 className="w-4 h-4" />
            {t("common.tryAgain")}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="bg-card rounded-lg p-12 shadow-sm text-center">
          <Loader2 className="animate-spin w-8 h-8 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("business.loadingJobs")}</p>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="p-4 border border-border rounded-md bg-card">
            <h3 className="text-base font-semibold mb-2">
              {t("business.totalJobs")}
            </h3>
            <p className="text-3xl font-bold text-primary">{jobs.total ?? 0}</p>
          </div>

          <div className="p-4 border border-border rounded-md bg-card">
            <h3 className="text-base font-semibold mb-2">
              {t("business.activeJobs")}
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {jobs.active ?? 0}
            </p>
          </div>

          <div className="p-4 border border-border rounded-md bg-card">
            <h3 className="text-base font-semibold mb-2">
              {t("common.completed")}
            </h3>
            <p className="text-3xl font-bold text-muted-foreground">
              {jobs.completed ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.jobsList?.length === 0 && (
        <div className="bg-card rounded-xl p-6 md:p-12 shadow-sm text-center border border-dashed border-border">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Building2 className="w-10 h-10 md:w-12 md:h-12 text-primary" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2">
              {locale === "id" ? "Belum Ada Pekerjaan Aktif" : "No Active Jobs"}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground text-center max-w-md mb-6">
              {locale === "id"
                ? "Mulai dengan membuat pekerjaan pertama Anda. Pekerja yang cocok akan melamar dan Anda bisa mengelola mereka dari sini."
                : "Start by creating your first job. Suitable workers will apply and you can manage them from here."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  window.location.href = "/business/jobs/new";
                }}
                className="inline-flex items-center justify-center gap-2 px-5 md:px-6 py-3 bg-primary text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-primary/90 shadow-sm hover:shadow-md min-h-[44px] touch-manipulation"
              >
                <Plus className="w-5 h-5" />
                {locale === "id" ? "Buat Pekerjaan Pertama" : "Create First Job"}
              </button>
              <button
                onClick={() => {
                  window.location.href = "/business/workers";
                }}
                className="inline-flex items-center justify-center gap-2 px-5 md:px-6 py-3 bg-muted text-foreground border border-border rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-muted/80 min-h-[44px] touch-manipulation"
              >
                <Users className="w-5 h-5" />
                {locale === "id" ? "Cari Pekerja" : "Browse Workers"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Jobs List */}
      {!loading && !error && jobs.jobsList && jobs.jobsList.length > 0 && (
        <div className="flex flex-col gap-6">
          {jobs.jobsList.map((job) => (
            <div
              key={job.id}
              className="bg-card rounded-lg shadow-sm overflow-hidden"
            >
              {/* Job Header */}
              <div className="p-4 px-6 border-b border-border bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{job.title}</h3>
                    {job.address && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{job.address}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // Open QR code dialog
                      const dialog = document.getElementById(
                        `qr-dialog-${job.id}`,
                      ) as HTMLDialogElement;
                      dialog?.showModal();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-primary/90"
                  >
                    <QrCode className="w-4 h-4" />
                    {t("business.qrCodeButton")}
                  </button>
                </div>
                {job.stats && job.stats.total > 0 && (
                  <div className="flex gap-6 mt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        {job.stats.total} {t("attendance.workers")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {job.stats.checkedIn} {t("attendance.checkIn")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <XCircle className="w-4 h-4" />
                      <span>
                        {job.stats.checkedOut} {t("attendance.checkOut")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Workers List */}
              {job.bookings && job.bookings.length > 0 && (
                <div className="p-6">
                  <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    {t("attendance.workerList")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {job.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 border border-border rounded-md bg-muted/30"
                      >
                        {/* Worker Info */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 relative">
                            {booking.worker?.avatar_url ? (
                              <Image
                                src={booking.worker.avatar_url}
                                alt={booking.worker.full_name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <span className="text-base font-semibold text-muted-foreground">
                                {booking.worker?.full_name?.charAt(0) || "?"}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {booking.worker?.full_name ||
                                t("attendance.worker")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.worker?.phone || ""}
                            </p>
                          </div>
                          {booking.check_out_at ? (
                            <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium flex items-center gap-1 shrink-0">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {t("common.completed")}
                            </div>
                          ) : booking.check_in_at ? (
                            <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium flex items-center gap-1 shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              {t("attendance.working")}
                            </div>
                          ) : (
                            <div className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium flex items-center gap-1 shrink-0">
                              <XCircle className="w-3.5 h-3.5" />
                              {t("attendance.notYet")}
                            </div>
                          )}
                        </div>

                        {/* Attendance Times */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
                          <div>
                            <span className="text-muted-foreground">
                              {t("bookings.checkInAt")}{" "}
                            </span>
                            <span className="font-medium">
                              {formatTime(booking.check_in_at)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {t("bookings.checkOutAt")}{" "}
                            </span>
                            <span className="font-medium">
                              {formatTime(booking.check_out_at)}
                            </span>
                          </div>
                        </div>

                        {/* Location Verification */}
                        {booking.check_in_lat && booking.check_in_lng && (
                          <div className="mt-2 pt-2 border-t border-border text-xs flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{t("business.locationVerified")}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* QR Code Dialogs */}
      {jobs.jobsList?.map((job) => (
        <dialog
          key={`qr-dialog-${job.id}`}
          id={`qr-dialog-${job.id}`}
          className="border-none rounded-lg p-0 max-w-[500px] w-[90%] shadow-xl backdrop:bg-black/50"
        >
          <div className="p-0">
            <QRCodeGenerator
              jobId={job.id}
              jobTitle={job.title}
              businessName={user?.user_metadata?.full_name || "Business"}
              address={job.address || undefined}
              startDate={job.deadline || undefined}
              existingQRCode={job.qr_code || undefined}
              onRefresh={handleQRRefresh}
            />
            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={() => {
                  const dialog = document.getElementById(
                    `qr-dialog-${job.id}`,
                  ) as HTMLDialogElement;
                  dialog?.close();
                }}
                className="px-4 py-2 bg-muted text-foreground border border-border rounded-md text-sm font-medium cursor-pointer hover:bg-muted/80"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </dialog>
      ))}
    </div>
  );
}
