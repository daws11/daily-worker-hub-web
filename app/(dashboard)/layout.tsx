"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { Loader2 } from "lucide-react";

/**
 * Parent layout for dashboard routes - handles authentication only.
 * Sidebar is rendered by child layouts (worker/business) via DashboardLayout.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    console.log(
      "[LAYOUT] Auth check - isLoading:",
      isLoading,
      "user:",
      user?.email || "null",
    );
    if (!isLoading && !user) {
      console.log("[LAYOUT] ⚠️ REDIRECTING TO LOGIN - no user found!");
      router.push("/login");
    } else if (!isLoading && user) {
      console.log("[LAYOUT] ✅ User authenticated, staying on page");
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render layout if not authenticated
  if (!user) {
    return null;
  }

  // Render children - sidebar handled by child layouts
  return <>{children}</>;
}
