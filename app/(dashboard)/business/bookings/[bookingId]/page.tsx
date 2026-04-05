"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle, XCircle, Clock, MapPin, Calendar, User, Briefcase } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  business_id: string;
  status: "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled";
  start_date: string;
  end_date: string;
  final_price: number;
  created_at: string;
  worker?: BookingWorker;
  job?: BookingJob;
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
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

function getStatusBadge(status: Booking["status"]) {
  const config: Record<Booking["status"], { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: "Menunggu", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", icon: <Clock className="w-3.5 h-3.5" /> },
    accepted: { label: "Diterima", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    rejected: { label: "Ditolak", className: "bg-red-500/10 text-red-700 dark:text-red-400", icon: <XCircle className="w-3.5 h-3.5" /> },
    in_progress: { label: "Sedang Bekerja", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: <Clock className="w-3.5 h-3.5" /> },
    completed: { label: "Selesai", className: "bg-green-500/10 text-green-700 dark:text-green-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    cancelled: { label: "Dibatalkan", className: "bg-muted text-muted-foreground", icon: <XCircle className="w-3.5 h-3.5" /> },
  };
  const { label, className, icon } = config[status];
  return (
    <Badge className={`${className} flex items-center gap-1`}>
      {icon}
      {label}
    </Badge>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { user, isLoading: authLoading } = useAuth();
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchBooking = React.useCallback(async () => {
    if (!bookingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await (supabase as any)
        .from("bookings")
        .select(
          `
          id,
          job_id,
          worker_id,
          business_id,
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
        .eq("id", bookingId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          throw new Error("Booking tidak ditemukan / Booking not found");
        }
        throw fetchError;
      }

      setBooking(data as unknown as Booking);
    } catch (err: any) {
      const message = err.message || "Gagal memuat detail booking";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  React.useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

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

  if (error && !booking) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/business/bookings">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Bookings
          </Button>
        </Link>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-destructive font-medium mb-1">Gagal memuat booking</p>
            <p className="text-destructive text-sm">{error}</p>
          </div>
          <Button onClick={fetchBooking} size="sm">
            <Loader2 className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/business/bookings">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Bookings
          </Button>
        </Link>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-destructive font-medium">
            Booking tidak ditemukan / Booking not found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/business/bookings">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">Detail Booking</h1>
        </div>
        {getStatusBadge(booking.status)}
      </div>

      {/* Worker Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Informasi Pekerja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {booking.worker?.avatar_url ? (
                <img
                  src={booking.worker.avatar_url}
                  alt={booking.worker.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">
                  {getInitials(booking.worker?.full_name || "?")}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">
                {booking.worker?.full_name || "Unknown Worker"}
              </p>
              <p className="text-muted-foreground">
                {booking.worker?.phone || "No phone number"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5" />
            Informasi Pekerjaan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{booking.job?.title || "Unknown Job"}</h3>
            <p className="text-muted-foreground mt-1">
              {booking.job?.description || "No description"}
            </p>
          </div>
          {booking.job?.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{booking.job.address}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Detail Booking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tanggal Mulai</p>
              <p className="font-medium">{formatDateTime(booking.start_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tanggal Selesai</p>
              <p className="font-medium">{formatDateTime(booking.end_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Harga Final</p>
              <p className="font-semibold text-lg text-primary">
                {formatPrice(booking.final_price)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dibuat Pada</p>
              <p className="font-medium">{formatDate(booking.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/business/bookings">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Bookings
          </Button>
        </Link>
      </div>
    </div>
  );
}
