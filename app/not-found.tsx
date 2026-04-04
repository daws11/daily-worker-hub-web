"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center py-12">
          <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Halaman Tidak Ditemukan</h2>
          <p className="text-muted-foreground text-center mb-6">
            Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
          </p>
          <Link href="/" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Home className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}