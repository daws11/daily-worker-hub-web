"use client";

import * as React from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Loader2, AlertCircle, CheckCircle, XCircle, Shield, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BadgeVerification {
  id: string;
  worker_id: string;
  badge_type: string;
  status: "pending" | "approved" | "rejected";
  verified_at: string | null;
  created_at: string;
  worker?: {
    id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

function getBadgeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    vip: "VIP Worker",
    expert: "Expert",
    verified: "Verified",
    preferred: "Preferred",
    background_check: "Background Check",
  };
  return labels[type] || type;
}

function getStatusBadge(status: BadgeVerification["status"]) {
  const config: Record<BadgeVerification["status"], { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: "Menunggu", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", icon: <Clock className="w-3.5 h-3.5" /> },
    approved: { label: "Disetujui", className: "bg-green-500/10 text-green-700 dark:text-green-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    rejected: { label: "Ditolak", className: "bg-red-500/10 text-red-700 dark:text-red-400", icon: <XCircle className="w-3.5 h-3.5" /> },
  };
  const { label, className, icon } = config[status];
  return (
    <Badge className={`${className} flex items-center gap-1`}>
      {icon}
      {label}
    </Badge>
  );
}

export default function BadgeVerificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [verifications, setVerifications] = React.useState<BadgeVerification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const fetchVerifications = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Set timeout for 10 seconds
    const timeoutId = setTimeout(() => {
      setError("Request timeout. Silakan coba lagi.");
      setIsLoading(false);
    }, 10000);

    try {
      const { data, error: fetchError } = await (supabase as any)
        .from("badge_verifications")
        .select(
          `
          id,
          worker_id,
          badge_type,
          status,
          verified_at,
          created_at,
          worker:workers(
            id,
            full_name,
            phone,
            avatar_url
          )
        `,
        )
        .order("created_at", { ascending: false });

      clearTimeout(timeoutId);

      if (fetchError) throw fetchError;

      setVerifications((data as unknown as BadgeVerification[]) || []);
    } catch (err: any) {
      const message = err.message || "Gagal memuat data verifikasi badge";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      clearTimeout(timeoutId);
    }
  }, []);

  React.useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleApprove = async (verification: BadgeVerification) => {
    setProcessingId(verification.id);
    try {
      // Stub API call - actual implementation would update the database
      toast.success(`Badge "${getBadgeTypeLabel(verification.badge_type)}" untuk ${verification.worker?.full_name} telah disetujui!`);
      
      // Update local state
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === verification.id ? { ...v, status: "approved" as const, verified_at: new Date().toISOString() } : v
        )
      );
    } catch (err: any) {
      toast.error(`Gagal menyetujui: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (verification: BadgeVerification) => {
    setProcessingId(verification.id);
    try {
      // Stub API call - actual implementation would update the database
      toast.success(`Badge "${getBadgeTypeLabel(verification.badge_type)}" untuk ${verification.worker?.full_name} telah ditolak.`);
      
      // Update local state
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === verification.id ? { ...v, status: "rejected" as const } : v
        )
      );
    } catch (err: any) {
      toast.error(`Gagal menolak: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
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
            Error: Tidak dapat memuat informasi pengguna. Silakan refresh halaman.
          </p>
        </div>
      </div>
    );
  }

  const pendingVerifications = verifications.filter((v) => v.status === "pending");
  const processedVerifications = verifications.filter((v) => v.status !== "pending");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Verifikasi Badge</h1>
        <p className="text-muted-foreground text-sm m-0">
          Kelola permintaan verifikasi badge pekerja
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div className="flex-1">
            <p className="text-destructive font-medium mb-1">Gagal memuat data</p>
            <p className="text-destructive text-sm">{error}</p>
          </div>
          <Button onClick={fetchVerifications} size="sm">
            <Loader2 className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="bg-card dark:bg-card rounded-lg p-12 shadow-sm text-center">
          <Loader2 className="animate-spin w-8 h-8 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data verifikasi...</p>
        </div>
      )}

      {/* Pending Verifications */}
      {!isLoading && !error && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Menunggu Persetujuan ({pendingVerifications.length})
            </h2>
            {pendingVerifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Tidak ada verifikasi badge yang menunggu</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingVerifications.map((verification) => (
                  <Card key={verification.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          {getBadgeTypeLabel(verification.badge_type)}
                        </span>
                        {getStatusBadge(verification.status)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Worker Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {verification.worker?.avatar_url ? (
                            <img
                              src={verification.worker.avatar_url}
                              alt={verification.worker.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-muted-foreground">
                              {getInitials(verification.worker?.full_name || "?")}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {verification.worker?.full_name || "Unknown Worker"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {verification.worker?.phone || ""}
                          </p>
                        </div>
                      </div>

                      {/* Date */}
                      <p className="text-xs text-muted-foreground">
                        Diajukan: {formatDate(verification.created_at)}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleApprove(verification)}
                          disabled={processingId === verification.id}
                        >
                          {processingId === verification.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Setuju
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => handleReject(verification)}
                          disabled={processingId === verification.id}
                        >
                          {processingId === verification.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Tolak
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Processed Verifications */}
          {processedVerifications.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Sudah Diproses ({processedVerifications.length})
              </h2>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {processedVerifications.map((verification) => (
                      <div key={verification.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {verification.worker?.avatar_url ? (
                              <img
                                src={verification.worker.avatar_url}
                                alt={verification.worker.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {verification.worker?.full_name || "Unknown Worker"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getBadgeTypeLabel(verification.badge_type)} • {formatDate(verification.created_at)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(verification.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
