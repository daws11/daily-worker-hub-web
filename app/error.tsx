"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { captureError } from "@/lib/sentry/client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console and Sentry
    console.error("Root error:", error);
    captureError(error, {
      tags: {
        section: "root",
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
          <h2 className="text-lg font-semibold mb-2">Terjadi Kesalahan</h2>
          <p className="text-muted-foreground text-center mb-6">
            Maaf, terjadi kesalahan pada sistem. Silakan coba lagi atau kembali
            ke beranda.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              ID Error: {error.digest}
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={reset} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
            <Link href="/" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
