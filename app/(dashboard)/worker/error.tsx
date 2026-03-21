"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, User } from "lucide-react";
import { captureException } from "@/lib/sentry";

export default function WorkerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console and Sentry
    console.error("Worker dashboard error:", error);
    captureException(error, {
      tags: {
        section: "worker",
        errorDigest: error.digest,
      },
      extra: {
        errorDigest: error.digest,
        message: error.message,
        stack: error.stack,
      },
    });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Gagal Memuat Dashboard Pekerja</h2>
          <p className="text-muted-foreground text-center mb-6">
            Terjadi kesalahan saat memuat dashboard pekerja Anda. Data mungkin
            tidak tersedia sementara. Silakan coba lagi.
          </p>
          <div className="flex gap-3">
            <Button onClick={reset} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
            <Button asChild>
              <Link href="/worker">
                <User className="h-4 w-4 mr-2" />
                Kembali
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
