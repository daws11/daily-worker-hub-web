"use client";

import * as React from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Users,
  ArrowLeft,
  Briefcase,
  Building2,
  Filter,
  Video,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicantCard } from "@/components/business/applicant-card";
import {
  getApplicationsByJob,
  updateApplicationStatus,
  acceptApplicationAndCreateBooking,
} from "@/lib/actions/job-applications";

// ============================================================================
// TYPES
// ============================================================================

type ApplicationStatus =
  | "pending"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";

interface JobInfo {
  id: string;
  title: string;
  description: string | null;
  budget_min: number;
  budget_max: number;
  status: string;
}

interface WorkerInfo {
  id: string;
  full_name: string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  tier: string;
  rating: number | null;
  reliability_score: number | null;
  jobs_completed: number | null;
}

interface JobApplication {
  id: string;
  job_id: string;
  worker_id: string;
  business_id: string;
  status: ApplicationStatus;
  cover_letter: string | null;
  proposed_wage: number | null;
  applied_at: string;
  workers: WorkerInfo | null;
}

interface JobWithBusiness {
  id: string;
  title: string;
  description: string | null;
  budget_min: number;
  budget_max: number;
  hours_needed: number | null;
  deadline: string | null;
  address: string | null;
  status: string;
  business_id: string;
  businesses: {
    id: string;
    name: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function BusinessApplicantsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = React.useState<JobWithBusiness | null>(null);
  const [applications, setApplications] = React.useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [bookingIds, setBookingIds] = React.useState<Record<string, string>>(
    {},
  );

  const fetchData = React.useCallback(async () => {
    if (!user?.id || !jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get business ID
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (businessError || !business) {
        throw new Error("Data bisnis tidak ditemukan");
      }

      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select(
          `
          id,
          title,
          description,
          budget_min,
          budget_max,
          hours_needed,
          deadline,
          address,
          business_id,
          businesses (
            id,
            name
          )
        `,
        )
        .eq("id", jobId)
        .eq("business_id", business.id)
        .single();

      if (jobError || !jobData) {
        throw new Error("Pekerjaan tidak ditemukan");
      }

      setJob(jobData as JobWithBusiness);

      // Fetch applications
      const result = await getApplicationsByJob(jobId, business.id);

      if (!result.success) {
        throw new Error(result.error || "Gagal memuat data pelamar");
      }

      const apps = result.data || [];
      setApplications(apps);

      // Fetch booking IDs for accepted applications
      const acceptedAppIds = apps
        .filter((app: any) => app.status === "accepted")
        .map((app: any) => app.id);

      if (acceptedAppIds.length > 0) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, application_id")
          .in("application_id", acceptedAppIds);

        if (bookings && bookings.length > 0) {
          const bookingMap: Record<string, string> = {};
          bookings.forEach((b: any) => {
            if (b.application_id) {
              bookingMap[b.application_id] = b.id;
            }
          });
          setBookingIds(bookingMap);
        }
      }
    } catch (err: any) {
      const message = err.message || "Gagal memuat data";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, jobId]);

  React.useEffect(() => {
    // Import supabase client
    const supabase = require("@/lib/supabase/client").supabase;
    fetchData();
  }, [fetchData]);

  // Import supabase at module level for the effect
  const supabase = React.useMemo(() => {
    return require("@/lib/supabase/client").supabase;
  }, []);

  const handleStatusUpdate = async (
    applicationId: string,
    newStatus: "shortlisted" | "accepted" | "rejected",
  ) => {
    if (!user?.id) return;

    setProcessingId(applicationId);

    try {
      // Get business ID
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!business) {
        toast.error("Data bisnis tidak ditemukan / Business data not found");
        return;
      }

      let result;

      if (newStatus === "accepted") {
        // Use special function that creates booking
        result = await acceptApplicationAndCreateBooking(
          applicationId,
          business.id,
        );
      } else {
        result = await updateApplicationStatus(
          applicationId,
          newStatus,
          business.id,
        );
      }

      if (!result.success) {
        toast.error(
          result.error || "Gagal mengupdate status / Failed to update status",
        );
        return;
      }

      // Store booking ID if accepted
      if (newStatus === "accepted" && result.data?.booking?.id) {
        const bookingId = result.data.booking.id;
        setBookingIds((prev) => ({ ...prev, [applicationId]: bookingId }));

        // Show toast with interview link
        toast.success(
          <div className="flex items-center gap-2">
            <span>
              Pelamar diterima! Booking dibuat. / Applicant accepted! Booking
              created.
            </span>
            <Link
              href={`/dashboard/business/interview/${bookingId}`}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-medium"
            >
              <Video className="h-4 w-4" />
              Mulai Interview
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>,
          { duration: 8000 },
        );
      } else {
        toast.success(
          newStatus === "accepted"
            ? "Pelamar diterima dan booking dibuat! / Applicant accepted and booking created!"
            : `Status lamaran diubah ke ${newStatus} / Application status changed to ${newStatus}`,
        );
      }

      // Refresh data
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan / An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  // Filter applications
  const filteredApplications = React.useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter((app) => app.status === statusFilter);
  }, [applications, statusFilter]);

  // Stats
  const stats = React.useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((a) => a.status === "pending").length,
      shortlisted: applications.filter((a) => a.status === "shortlisted").length,
      accepted: applications.filter((a) => a.status === "accepted").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    }),
    [applications],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-900 font-medium">
            Error: Tidak dapat memuat informasi pengguna. Silakan refresh
            halaman.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/business/jobs")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Pekerjaan
        </Button>

        {/* Job Header */}
        {job && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    {job.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{job.businesses?.name}</span>
                  </div>
                </div>
                <Badge
                  variant={job.status === "open" ? "default" : "secondary"}
                >
                  {job.status === "open" ? "Aktif" : job.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Budget</span>
                  <p className="font-semibold">
                    {job.budget_min === job.budget_max
                      ? formatPrice(job.budget_min)
                      : `${formatPrice(job.budget_min)} - ${formatPrice(job.budget_max)}`}
                  </p>
                </div>
                {job.hours_needed && (
                  <div>
                    <span className="text-muted-foreground">Durasi</span>
                    <p className="font-semibold">{job.hours_needed} jam</p>
                  </div>
                )}
                {job.deadline && (
                  <div>
                    <span className="text-muted-foreground">Deadline</span>
                    <p className="font-semibold">{formatDate(job.deadline)}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Total Pelamar</span>
                  <p className="font-semibold">{stats.total} orang</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Menunggu</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Dipilih</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.shortlisted}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Diterima</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.accepted}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Ditolak</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="shortlisted">Dipilih</SelectItem>
              <SelectItem value="accepted">Diterima</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-red-900 font-medium mb-1">Gagal memuat data</p>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <Button onClick={fetchData} size="sm">
              <Loader2 className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="bg-white rounded-lg p-12 shadow-sm text-center">
            <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Memuat data pelamar...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredApplications.length === 0 && (
          <div className="bg-white rounded-lg p-12 shadow-sm text-center border-2 border-dashed border-gray-300">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {statusFilter === "all"
                ? "Belum Ada Pelamar"
                : "Tidak ada pelamar dengan status ini"}
            </h3>
            <p className="text-gray-600">
              {statusFilter === "all"
                ? "Pelamar akan muncul di sini setelah ada yang melamar ke pekerjaan ini"
                : "Coba ubah filter untuk melihat pelamar lainnya"}
            </p>
          </div>
        )}

        {/* Applications List */}
        {!isLoading && !error && filteredApplications.length > 0 && (
          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            {filteredApplications.map((application) => (
              <ApplicantCard
                key={application.id}
                application={application}
                budgetMin={job?.budget_min || 0}
                budgetMax={job?.budget_max || 0}
                onShortlist={() =>
                  handleStatusUpdate(application.id, "shortlisted")
                }
                onAccept={() => handleStatusUpdate(application.id, "accepted")}
                onReject={() => handleStatusUpdate(application.id, "rejected")}
                isProcessing={processingId === application.id}
                bookingId={
                  application.status === "accepted"
                    ? bookingIds[application.id]
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
