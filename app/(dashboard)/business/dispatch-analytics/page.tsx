"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/app/providers/auth-provider";
import { DispatchAnalytics } from "@/components/business/dispatch-analytics";
import { Loader2 } from "lucide-react";

export default function BusinessDispatchAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBusinessId() {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const { supabase } = await import("@/lib/supabase/client");
        const { data, error } = await (supabase as any)
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (error || !data) {
          toast.error("Profil bisnis tidak ditemukan");
          router.push("/business");
          return;
        }

        setBusinessId(data.id);
      } catch (err) {
        console.error("Error fetching business:", err);
        toast.error("Gagal memuat data bisnis");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBusinessId();
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Memuat analytics...
          </p>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Business not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4">
      <DispatchAnalytics businessId={businessId} />
    </div>
  );
}