"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { captureException } from "@/lib/sentry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report global error to Sentry
    console.error("Global fatal error:", error);
    captureException(error, {
      tags: {
        section: "global",
        errorDigest: error.digest,
        fatalError: "true",
      },
      extra: {
        errorDigest: error.digest,
        message: error.message,
        stack: error.stack,
      },
    });
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
          <div className="max-w-md w-full bg-card border rounded-lg p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3">Terjadi Kesalahan Sistem</h1>
            <p className="text-muted-foreground mb-6">
              Maaf, aplikasi mengalami kesalahan yang tidak terduga. Tim kami
              telah diberitahu dan sedang berusaha memperbaikinya.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mb-4 font-mono">
                ID Error: {error.digest}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
              >
                <Home className="h-4 w-4" />
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
