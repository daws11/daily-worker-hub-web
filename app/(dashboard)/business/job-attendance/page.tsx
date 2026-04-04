"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { useAttendance } from "@/lib/hooks/use-attendance";
import { useTranslation } from "@/lib/i18n/hooks";
import { useRouter } from "next/navigation";
import { QRCodeGenerator } from "@/components/attendance/qr-code-generator";
import { getBusinessJobs } from "@/lib/supabase/queries/jobs";
import { getJobBookings } from "@/lib/supabase/queries/bookings";
import { supabase } from "@/lib/supabase/client";
import type { JobsRow } from "@/lib/supabase/queries/jobs";
import type { JobBookingWithDetails } from "@/lib/supabase/queries/bookings";
import {
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JobWithAttendance extends JobsRow {
  bookings?: JobBookingWithDetails[];
  stats?: {
    total: number;
    checkedIn: number;
    checkedOut: number;
  };
}

export default function BusinessJobAttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [jobs, setJobs] = useState<JobWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Fetch business jobs with attendance data
  const fetchJobsWithAttendance = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch active jobs for the business
      const businessJobs = await getBusinessJobs(businessId);
      const activeJobs = businessJobs.filter(
        (job) => job.status === "open" || job.status === "in_progress",
      );

      // Fetch bookings for each job
      const jobsWithAttendance: JobWithAttendance[] = await Promise.all(
        activeJobs.map(async (job) => {
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

      setJobs(jobsWithAttendance);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.loadFailed");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [businessId, t]);

  // Handle QR code refresh
  const handleQRRefresh = useCallback(() => {
    fetchJobsWithAttendance();
  }, [fetchJobsWithAttendance]);

  // Format time based on current locale
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

  // Check if business has completed onboarding and fetch jobs
  useEffect(() => {
    async function checkBusinessProfile() {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const { data: business } = await (supabase as any)
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!business) {
          router.push("/onboarding");
          return;
        }

        setBusinessId(business.id);
      } catch {
        router.push("/onboarding");
      } finally {
        setIsCheckingProfile(false);
      }
    }

    checkBusinessProfile();
  }, [user, router, supabase]);

  // Fetch jobs when businessId is available
  useEffect(() => {
    if (businessId) {
      fetchJobsWithAttendance();
    }
  }, [businessId, fetchJobsWithAttendance]);

  // Show loading state while checking profile
  if (isCheckingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("jobAttendance.title")}
        </h1>
        <p className="text-muted-foreground">{t("jobAttendance.subtitle")}</p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errors.loadFailed")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobsWithAttendance}
            >
              <Loader2 className="mr-2 h-4 w-4" />
              {t("common.tryAgain")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {t("jobAttendance.loading")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title={t("jobAttendance.noActiveJobs")}
          description={t("jobAttendance.noActiveJobsDesc")}
        />
      )}

      {/* Jobs List */}
      {!loading && !error && jobs.length > 0 && (
        <div className="space-y-6">
          {jobs.map((job) => (
            <Card key={job.id} className="overflow-hidden">
              {/* Job Header */}
              <CardHeader className="bg-muted/50 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    {job.address && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.address}</span>
                      </div>
                    )}
                  </div>
                  {job.stats && (
                    <div className="flex gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {job.stats.total}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("common.total")}
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {job.stats.checkedIn}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("attendance.checkIn")}
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-muted-foreground">
                          {job.stats.checkedOut}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("attendance.checkOut")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                {/* QR Code Section */}
                <div className="p-6">
                  <QRCodeGenerator
                    jobId={job.id}
                    jobTitle={job.title}
                    businessName={user?.user_metadata?.full_name || "Business"}
                    address={job.address || undefined}
                    startDate={job.deadline || undefined}
                    existingQRCode={job.qr_code || undefined}
                    onRefresh={handleQRRefresh}
                  />
                </div>

                {/* Workers List Section */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-semibold">
                      {t("jobAttendance.workerList")}
                    </h4>
                  </div>

                  {!job.bookings || job.bookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Users className="h-8 w-8 mb-2" />
                      <p className="text-sm">{t("jobAttendance.noWorkers")}</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-3">
                        {job.bookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="p-3 border rounded-lg bg-muted/30"
                          >
                            {/* Worker Name */}
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={booking.worker?.avatar_url}
                                  alt={booking.worker?.full_name}
                                />
                                <AvatarFallback className="text-xs">
                                  {booking.worker?.full_name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {booking.worker?.full_name ||
                                    t("jobAttendance.worker")}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {booking.worker?.phone || ""}
                                </p>
                              </div>
                              {booking.check_out_at ? (
                                <Badge
                                  variant="default"
                                  className="bg-green-600"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t("attendance.completed")}
                                </Badge>
                              ) : booking.check_in_at ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {t("attendance.working")}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {t("attendance.notYet")}
                                </Badge>
                              )}
                            </div>

                            {/* Attendance Times */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">
                                  {t("attendance.checkIn")}:{" "}
                                </span>
                                <span className="font-medium">
                                  {formatTime(booking.check_in_at)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  {t("attendance.checkOut")}:{" "}
                                </span>
                                <span className="font-medium">
                                  {formatTime(booking.check_out_at)}
                                </span>
                              </div>
                            </div>

                            {/* Location Verification */}
                            {booking.check_in_lat && booking.check_in_lng && (
                              <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>{t("business.locationVerified")}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
