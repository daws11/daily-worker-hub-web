import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PublicWorkerProfile,
  PublicWorkerProfileProps,
} from "@/components/workers/public-worker-profile";
import type { ReliabilityHistoryEntry } from "@/components/worker/reliability-history-chart";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Fetch worker data from API
async function getWorkerProfile(
  id: string,
): Promise<PublicWorkerProfileProps["worker"] | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/workers/${id}/public`, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch worker: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching worker profile:", error);
    return null;
  }
}

// Fetch reliability history from API
async function getWorkerReliabilityHistory(
  id: string,
): Promise<ReliabilityHistoryEntry[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/workers/${id}/reliability-history`, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!res.ok) {
      return [];
    }

    const response = await res.json();
    return response.data || [];
  } catch (error) {
    console.error("Error fetching reliability history:", error);
    return [];
  }
}

// Generate metadata for SEO and Open Graph
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const worker = await getWorkerProfile(id);

  if (!worker) {
    return {
      title: "Worker Not Found - Daily Worker Hub",
      description: "The requested worker profile could not be found.",
    };
  }

  const skillsText = worker.skills.map((s) => s.name).join(", ");
  const ratingText = worker.stats.avgRating
    ? `${worker.stats.avgRating.toFixed(1)}★ rating`
    : "New worker";

  const description = worker.bio
    ? `${worker.fullName} - ${skillsText}. ${ratingText}. ${worker.bio.slice(0, 100)}${worker.bio.length > 100 ? "..." : ""}`
    : `${worker.fullName} - ${skillsText}. ${ratingText}. ${worker.stats.jobsCompleted} jobs completed.`;

  return {
    title: `${worker.fullName} - Daily Worker Hub`,
    description,
    openGraph: {
      title: `${worker.fullName} - Daily Worker Hub`,
      description,
      images: worker.avatarUrl
        ? [{ url: worker.avatarUrl, alt: worker.fullName }]
        : [{ url: "/default-worker-avatar.png", alt: worker.fullName }],
      type: "profile",
      locale: "en_US",
      siteName: "Daily Worker Hub",
    },
    twitter: {
      card: "summary_large_image",
      title: `${worker.fullName} - Daily Worker Hub`,
      description,
      images: worker.avatarUrl
        ? [worker.avatarUrl]
        : ["/default-worker-avatar.png"],
    },
    alternates: {
      canonical: `/workers/${id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// Server Component Page
export default async function WorkerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const worker = await getWorkerProfile(id);

  if (!worker) {
    notFound();
  }

  // Fetch reliability history
  const reliabilityHistory = await getWorkerReliabilityHistory(id);

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <PublicWorkerProfile
        worker={worker}
        isAuthenticated={false} // Will be determined client-side
        reliabilityHistory={reliabilityHistory}
      />
    </main>
  );
}

// Generate static params for known workers (optional optimization)
export async function generateStaticParams() {
  // Return empty array for dynamic rendering
  // In production, you could pre-generate top worker profiles
  return [];
}
