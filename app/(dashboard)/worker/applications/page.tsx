"use client";

import * as React from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";
import { getApplicationsByWorker } from "@/lib/actions/job-applications";
import {
  Loader2,
  AlertCircle,
  Building2,
  Briefcase,
  Calendar,
  Video,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export type ApplicationStatus =
  | "pending"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface ApplicationJob {
  id: string;
  title: string;
  description: string;
  budget_min: number;
  budget_max: number;
  hours_needed: number;
  deadline: string;
  address: string;
}

export interface ApplicationBusiness {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface ApplicationBooking {
  id: string;
  application_id: string;
}

export interface Application {
  id: string;
  job_id: string;
  worker_id: string;
  business_id: string;
  status: ApplicationStatus;
  applied_at: string;
  cover_letter?: string;
  proposed_wage?: number;
  jobs?: ApplicationJob;
  businesses?: ApplicationBusiness;
  booking?: ApplicationBooking;
}

const statusVariants: Record<
  ApplicationStatus,
  { className: string; label: string }
> = {
  pending: {
    className:
      "border-transparent bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
    label: "Pending",
  },
  shortlisted: {
    className:
      "border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
    label: "Shortlisted",
  },
  accepted: {
    className:
      "border-transparent bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
    label: "Accepted",
  },
  rejected: {
    className:
      "border-transparent bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
    label: "Rejected",
  },
  withdrawn: {
    className:
      "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
    label: "Withdrawn",
  },
};

type StatusGroup = {
  pending: Application[];
  shortlisted: Application[];
  accepted: Application[];
  rejected: Application[];
  withdrawn: Application[];
};

const statusGroupLabels: Record<keyof StatusGroup, string> = {
  pending: "Pending",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function groupApplicationsByStatus(applications: Application[]): StatusGroup {
  return applications.reduce<StatusGroup>(
    (groups, application) => {
      if (application.status in groups) {
        groups[application.status as keyof StatusGroup].push(application);
      }
      return groups;
    },
    { pending: [], shortlisted: [], accepted: [], rejected: [], withdrawn: [] },
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function ApplicationCard({ application }: { application: Application }) {
  const statusConfig = statusVariants[application.status];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex-1 space-y-1">
          <CardTitle className="text-lg">
            {application.jobs?.title || "Unknown Job"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {application.businesses?.name || "Unknown Business"}
            </span>
          </div>
        </div>
        <Badge className={cn(statusConfig.className)}>
          {statusConfig.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {application.jobs?.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {application.jobs.description}
          </p>
        )}

        <div className="flex flex-col gap-2 text-sm">
          {application.jobs?.budget_min && application.jobs?.budget_max && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-medium">
                {formatPrice(application.jobs.budget_min)} -{" "}
                {formatPrice(application.jobs.budget_max)}
              </span>
            </div>
          )}

          {application.jobs?.address && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium flex-1">
                {application.jobs.address}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Applied on {formatDate(application.applied_at)}</span>
        </div>

        {/* Join Interview Button - Only for accepted applications with booking */}
        {application.status === "accepted" && application.booking && (
          <div className="pt-3 border-t">
            <Link
              href={`/dashboard/business/interview/${application.booking.id}`}
              className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Video className="h-4 w-4" />
              Gabung Interview
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkerApplicationsPage() {
  const { signOut, user, isLoading: authLoading } = useAuth();
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<keyof StatusGroup | "all">(
    "all",
  );

  const fetchApplications = React.useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getApplicationsByWorker(user.id);

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch applications");
      }

      const applicationsData = result.data || [];

      // Fetch booking data for accepted applications
      // Match bookings to applications via job_id and worker_id
      const acceptedJobs = applicationsData
        .filter((app: any) => app.status === "accepted")
        .map((app: any) => ({
          jobId: app.job_id,
          workerId: app.worker_id,
          appId: app.id,
        }));

      if (acceptedJobs.length > 0) {
        // Get all bookings for these job+worker combinations
        const jobIds = [...new Set(acceptedJobs.map((j) => j.jobId))];

        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("id, job_id, worker_id")
          .in("job_id", jobIds);

        // Create a map of application_id -> booking (matched by job_id + worker_id)
        const bookingMap = new Map<string, { id: string }>();
        bookingsData?.forEach((booking) => {
          const matchingApp = acceptedJobs.find(
            (app) =>
              app.jobId === booking.job_id &&
              app.workerId === booking.worker_id,
          );
          if (matchingApp && booking?.id) {
            bookingMap.set(matchingApp.appId, { id: booking.id });
          }
        });

        // Merge booking data into applications
        const applicationsWithBookings = applicationsData.map((app: any) => ({
          ...app,
          booking: bookingMap.get(app.id),
        }));

        setApplications(applicationsWithBookings);
      } else {
        setApplications(applicationsData);
      }
    } catch (err: any) {
      const message = err.message || "Gagal memuat data lamaran";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleLogout = async () => {
    await signOut();
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

  const groupedApplications = groupApplicationsByStatus(applications);

  // Get applications to display based on active tab
  const displayApplications =
    activeTab === "all" ? applications : groupedApplications[activeTab];

  const tabCounts = {
    all: applications.length,
    pending: groupedApplications.pending.length,
    shortlisted: groupedApplications.shortlisted.length,
    accepted: groupedApplications.accepted.length,
    rejected: groupedApplications.rejected.length,
    withdrawn: groupedApplications.withdrawn.length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Lamaran Pekerjaan</h1>
          <p className="text-sm text-muted-foreground m-0">
            Lihat status lamaran pekerjaan Anda
          </p>
        </div>
        <Button
          onClick={handleLogout}
          disabled={authLoading}
          variant="destructive"
          size="sm"
        >
          {authLoading ? "Memproses..." : "Keluar"}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-destructive font-medium mb-1">
              Gagal memuat data
            </p>
            <p className="text-destructive text-sm">{error}</p>
          </div>
          <Button onClick={fetchApplications} size="sm">
            <Loader2 className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="bg-card rounded-lg p-12 shadow-sm text-center">
          <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Memuat data lamaran...</p>
        </div>
      )}

      {/* Tabs */}
      {!isLoading && !error && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("all")}
          >
            Semua ({tabCounts.all})
          </Button>
          {Object.keys(groupedApplications).map((status) => {
            const count = tabCounts[status as keyof StatusGroup];
            if (count === 0) return null;

            return (
              <Button
                key={status}
                variant={activeTab === status ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(status as keyof StatusGroup)}
              >
                {statusGroupLabels[status as keyof StatusGroup]} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && displayApplications.length === 0 && (
        <div className="bg-card rounded-lg p-12 shadow-sm text-center border-2 border-dashed border-border">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {activeTab === "all"
              ? "Belum Ada Lamaran"
              : `Tidak Ada Lamaran ${statusGroupLabels[activeTab as keyof StatusGroup]}`}
          </h3>
          <p className="text-muted-foreground">
            {activeTab === "all"
              ? "Lamaran pekerjaan akan muncul di sini setelah Anda mengirimkan lamaran"
              : "Tidak ada lamaran dengan status ini"}
          </p>
        </div>
      )}

      {/* Applications List */}
      {!isLoading && !error && displayApplications.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayApplications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
