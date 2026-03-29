"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  createJobApplication,
  getApplicationsByJob,
  getApplicationsByWorker,
  updateApplicationStatus,
  acceptApplicationAndCreateBooking,
  withdrawApplication,
  type ApplicationResult,
  type ApplicationWithBooking,
} from "../actions/job-applications";
import type { Database } from "../supabase/types";
import { useTranslation } from "../i18n/hooks";

type JobApplicationRow =
  Database["public"]["Tables"]["job_applications"]["Row"];
type ApplicationStatus =
  JobApplicationRow["status"];

type UseApplicationsOptions = {
  jobId?: string;
  workerId?: string;
  businessId?: string;
  applicationId?: string;
  status?: ApplicationStatus;
  autoFetch?: boolean;
};

type UseApplicationsReturn = {
  applications: JobApplicationRow[] | null;
  application: JobApplicationRow | null;
  isLoading: boolean;
  error: string | null;
  fetchApplications: () => Promise<void>;
  fetchApplication: () => Promise<void>;
  createApplication: (
    jobId: string,
    workerId: string,
    options?: {
      coverLetter?: string;
      proposedWage?: number;
      availability?: any[];
    },
  ) => Promise<ApplicationResult>;
  updateStatus: (
    applicationId: string,
    status: "shortlisted" | "accepted" | "rejected",
  ) => Promise<void>;
  acceptAndBook: (applicationId: string) => Promise<ApplicationWithBooking | null>;
  withdraw: (applicationId: string) => Promise<void>;
  refreshApplications: () => Promise<void>;
};

export function useApplications(
  options: UseApplicationsOptions = {},
): UseApplicationsReturn {
  const {
    jobId,
    workerId,
    businessId,
    applicationId,
    status,
    autoFetch = true,
  } = options;
  const { t } = useTranslation();

  const [applications, setApplications] = useState<JobApplicationRow[] | null>(
    null,
  );
  const [application, setApplication] = useState<JobApplicationRow | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!jobId && !workerId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result;

      if (jobId && businessId) {
        result = await getApplicationsByJob(jobId, businessId);
      } else if (workerId) {
        result = await getApplicationsByWorker(workerId, status);
      } else {
        return;
      }

      if (result.error) {
        setError(result.error);
        toast.error(
          t("applications.fetchApplicationsFailed", {
            message: result.error,
          }),
        );
        return;
      }

      setApplications(result.data as JobApplicationRow[] | null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("errors.generic");
      setError(errorMessage);
      toast.error(
        t("applications.fetchApplicationsFailed", { message: errorMessage }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobId, workerId, businessId, status]);

  const fetchApplication = useCallback(async () => {
    if (!applicationId) {
      return;
    }

    // Single application fetch is covered by fetchApplications
    // when a specific applicationId is needed, we filter locally
    if (applications && applications.length > 0) {
      const found = applications.find((a) => a.id === applicationId) || null;
      setApplication(found);
    }
  }, [applicationId, applications]);

  const createApplication = useCallback(
    async (
      jobId: string,
      workerId: string,
      opts?: {
        coverLetter?: string;
        proposedWage?: number;
        availability?: any[];
      },
    ): Promise<ApplicationResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await createJobApplication(jobId, workerId, opts);

        if (!result.success) {
          setError(result.error || t("errors.generic"));
          toast.error(
            t("applications.createApplicationFailed", {
              message: result.error,
            }),
          );
          return result;
        }

        toast.success(t("applications.createApplicationSuccess"));

        // Refresh applications after creation
        await fetchApplications();

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("errors.generic");
        setError(errorMessage);
        toast.error(
          t("applications.createApplicationFailed", { message: errorMessage }),
        );
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [fetchApplications],
  );

  const updateStatus = useCallback(
    async (
      applicationId: string,
      newStatus: "shortlisted" | "accepted" | "rejected",
    ) => {
      if (!businessId) {
        const errorMessage = "Business ID is required to update application status";
        setError(errorMessage);
        toast.error(
          t("applications.updateStatusFailed", { message: errorMessage }),
        );
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await updateApplicationStatus(
          applicationId,
          newStatus,
          businessId,
        );

        if (!result.success) {
          setError(result.error || t("errors.generic"));
          toast.error(
            t("applications.updateStatusFailed", { message: result.error }),
          );
          return;
        }

        toast.success(t("applications.updateStatusSuccess"));

        // Refresh applications after update
        await fetchApplications();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("errors.generic");
        setError(errorMessage);
        toast.error(
          t("applications.updateStatusFailed", { message: errorMessage }),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [businessId, fetchApplications],
  );

  const acceptAndBook = useCallback(
    async (
      applicationId: string,
    ): Promise<ApplicationWithBooking | null> => {
      if (!businessId) {
        const errorMessage = "Business ID is required to accept application";
        setError(errorMessage);
        toast.error(
          t("applications.acceptApplicationFailed", { message: errorMessage }),
        );
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await acceptApplicationAndCreateBooking(
          applicationId,
          businessId,
        );

        if (!result.success) {
          setError(result.error || t("errors.generic"));
          toast.error(
            t("applications.acceptApplicationFailed", {
              message: result.error,
            }),
          );
          return null;
        }

        toast.success(t("applications.acceptApplicationSuccess"));

        // Refresh applications after acceptance
        await fetchApplications();

        return result.data || null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("errors.generic");
        setError(errorMessage);
        toast.error(
          t("applications.acceptApplicationFailed", { message: errorMessage }),
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [businessId, fetchApplications],
  );

  const withdraw = useCallback(
    async (applicationId: string) => {
      if (!workerId) {
        const errorMessage = "Worker ID is required to withdraw application";
        setError(errorMessage);
        toast.error(
          t("applications.withdrawApplicationFailed", { message: errorMessage }),
        );
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await withdrawApplication(applicationId, workerId);

        if (!result.success) {
          setError(result.error || t("errors.generic"));
          toast.error(
            t("applications.withdrawApplicationFailed", {
              message: result.error,
            }),
          );
          return;
        }

        toast.success(t("applications.withdrawApplicationSuccess"));

        // Refresh applications after withdrawal
        await fetchApplications();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("errors.generic");
        setError(errorMessage);
        toast.error(
          t("applications.withdrawApplicationFailed", { message: errorMessage }),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [workerId, fetchApplications],
  );

  const refreshApplications = useCallback(async () => {
    await fetchApplications();
  }, [fetchApplications]);

  // Auto-fetch on mount and when options change
  useEffect(() => {
    if (autoFetch) {
      fetchApplications();
    }
  }, [autoFetch, fetchApplications]);

  return {
    applications,
    application,
    isLoading,
    error,
    fetchApplications,
    fetchApplication,
    createApplication,
    updateStatus,
    acceptAndBook,
    withdraw,
    refreshApplications,
  };
}
