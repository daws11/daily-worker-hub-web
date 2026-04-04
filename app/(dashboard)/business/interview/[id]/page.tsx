/**
 * Interview Page - DEPRECATED
 *
 * This page is no longer functional as the interview system has been removed.
 * Job applications now go directly to:
 * - Worker applies for job
 * - Business reviews worker profile in /business/jobs/[id]/applicants
 * - Business accepts/rejects application
 * - If accepted, booking is created directly
 *
 * @deprecated Use /business/jobs/[id]/applicants to review applications
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, AlertCircle } from "lucide-react";

interface InterviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/business/jobs">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Daftar Pekerjaan
          </Button>
        </Link>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="text-xl text-amber-900">
                Interview System Removed
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-amber-800">
            <p>
              Sistem interview telah dihapus. Proses hiring sekarang lebih sederhana:
            </p>
            
            <div className="bg-white/60 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium">Worker melamar pekerjaan</p>
                  <p className="text-sm text-amber-700">
                    Worker Classic harus memiliki profile lengkap (foto, bio, skills)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium">Business mereview profile</p>
                  <p className="text-sm text-amber-700">
                    Lihat pelamar di halaman applicants
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium">Accept/Reject</p>
                  <p className="text-sm text-amber-700">
                    Jika accept, booking dibuat langsung
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/business/jobs" className="flex-1">
                <Button className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Lihat Lowongan
                </Button>
              </Link>
              <Link href={`/business/jobs/${id}/applicants`} className="flex-1">
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Lihat Pelamar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
