"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TierBadgeDetailed } from "@/components/worker/tier-badge";
import { AvailabilitySlots } from "@/components/worker/availability-slots";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Wallet,
  CalendarCheck,
  CreditCard,
  FileText,
  Award,
  Clock,
  Calendar,
  LogOut,
  ChevronRight,
  ChevronDown,
  User,
  Bell,
  Lock,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { WorkerTier } from "@/lib/supabase/types";
import { DAY_NAMES } from "@/lib/algorithms/availability-checker";
import { setWorkerAvailabilityForWeek } from "@/lib/algorithms/availability-checker";
import { getUserNotificationPreferences, updateUserNotificationPreferences } from "@/lib/actions/push-notifications";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const workerMenuItems: MenuItem[] = [
  { title: "Profil", href: "/worker/profile", icon: User, description: "Informasi profil Anda" },
  { title: "Wallet", href: "/worker/wallet", icon: Wallet, description: "Saldo dan earnings" },
  { title: "Bookings", href: "/worker/bookings", icon: CalendarCheck, description: "Riwayat booking" },
  { title: "Earnings", href: "/worker/earnings", icon: CreditCard, description: "Pendapatan" },
  { title: "Applications", href: "/worker/applications", icon: FileText, description: "Lamaran kerja" },
  { title: "Badges", href: "/worker/badges", icon: Award, description: "Badge & pencapaian" },
  // Attendance removed - dispatch flow
  { title: "Availability", href: "/worker/availability", icon: Calendar, description: "Atur ketersediaan" },
];

const bottomMenuItems: MenuItem[] = [
  { title: "Notifikasi", href: "/worker/settings?tab=notifications", icon: Bell },
  { title: "Keamanan", href: "/worker/settings?tab=security", icon: Lock },
  { title: "Bantuan", href: "/worker/settings?tab=help", icon: HelpCircle },
  { title: "Kebijakan", href: "/worker/settings?tab=policy", icon: ExternalLink },
];

interface AvailabilitySlot {
  dayOfWeek: number;
  dayName: string;
  isAvailable: boolean;
  startHour: number;
  endHour: number;
}

// FAQ data for the help tab
interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

interface FAQCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    title: "Akun & Login",
    icon: User,
    items: [
      {
        question: "Saya tidak bisa login. Apa yang harus dilakukan?",
        answer: "Coba langkah-langkah berikut:\n1. Pastikan koneksi internet aktif\n2. Masukkan nomor HP/email dengan format yang benar (tanpa +62, contoh: 081234567890)\n3. Klik \"Lupa Password\" dan cek email untuk reset password\n4. Pastikan akun Anda tidak sedang dinonaktifkan. Hubungi tim support jika masih bermasalah.",
      },
      {
        question: "Saya lupa password. Bagaimana cara meresetnya?",
        answer: "1. Di halaman login, ketuk \"Lupa Password\"\n2. Masukkan email yang terdaftar\n3. Cek inbox atau folder Spam untuk email reset\n4. Ikuti tautan reset dan buat password baru (minimal 8 karakter)\n5. Login ulang dengan password baru.",
      },
      {
        question: "Bagaimana cara mengubah nomor HP di akun saya?",
        answer: "1. Login ke aplikasi\n2. Buka Pengaturan → Profil\n3. Pilih \"Ubah Nomor HP\"\n4. Masukkan nomor HP baru yang aktif\n5. Masukkan kode OTP untuk verifikasi\n6. Nomor HP berhasil diperbarui.",
      },
    ],
  },
  {
    title: "Verifikasi KYC",
    icon: FileText,
    items: [
      {
        question: "KYC saya ditolak. Apa yang harus dilakukan?",
        answer: "Perbaiki dokumen sesuai alasan penolakan:\n• Foto KTP blur → Upload ulang foto yang lebih jelas\n• KTP expired → Upload KTP baru yang masih berlaku\n• Wajah tidak cocok dengan KTP → Ambil selfie ulang\n\n1. Buka Pengaturan → Verifikasi KYC\n2. Baca alasan penolakan\n3. Upload ulang dokumen yang diminta\n4. Tunggu hasil verifikasi (1–2 hari kerja)",
      },
      {
        question: "Berapa lama proses verifikasi KYC?",
        answer: "Proses KYC membutuhkan waktu:\n• Submitted → In Review: 1–2 hari kerja\n• In Review → Approved/Rejected: 1–2 hari kerja\n\nCatatan: Proses bisa lebih lama saat hari libur nasional. Jika lebih dari 3 hari kerja belum ada tanggapan, hubungi tim support kami.",
      },
      {
        question: "Foto selfie tidak bisa diupload. Apa yang harus dilakukan?",
        answer: "Pastikan:\n• Format file JPG atau PNG, ukuran maksimal 5MB\n• Wajah terlihat jelas dengan pencahayaan yang cukup\n• KTP terlihat penuh di foto dengan teks yang terbaca\n• Tidak ada pantulan cahaya atau bayangan\n\nJika masih bermasalah, coba gunakan browser Chrome/Safari dan pastikan koneksi internet stabil.",
      },
    ],
  },
  {
    title: "Lowongan & Pelamaran",
    icon: CalendarCheck,
    items: [
      {
        question: "Mengapa saya tidak bisa melamar pekerjaan tertentu?",
        answer: "Beberapa penyebab:\n• KYC belum disetujui\n•违反 aturan 21 hari (sudah bekerja di bisnis yang sama dalam 21 hari terakhir)\n• Lowongan sudah ditutup atau kuota pelamar sudah penuh\n• Tier tidak sesuai dengan persyaratan lowongan\n• Profil belum lengkap\n\nSolusi: Buka profil dan periksa kelengkapan data. Tunggu KYC disetujui.",
      },
      {
        question: "Lamaran saya ditolak. Apakah saya bisa melamar ulang?",
        answer: "Ya, Anda bisa melamar ulang ke lowongan yang sama atau bisnis lain.\n\nJika ditolak oleh bisnis tertentu, Anda tetap bisa melamar lowongan lain. Tidak ada batasan jumlah lamaran yang bisa diajukan. Pastikan profil dan KYC Anda sudah lengkap.",
      },
      {
        question: "Bagaimana cara melamar pekerjaan?",
        answer: "1. Buka halaman \"Pasar Kerja\" di aplikasi\n2. Gunakan filter untuk menemukan pekerjaan yang sesuai (kategori, lokasi, tanggal, gaji)\n3. Ketuk kartu lowongan untuk melihat detail\n4. Jika sesuai, ketuk tombol \"Lamar Sekarang\"\n5. Tunggu konfirmasi dari bisnis pemberi kerja\n6. Cek status lamaran di halaman \"Lamaran Saya\"",
      },
    ],
  },
  {
    title: "Absensi & Check-in",
    icon: Clock,
    items: [
      {
        question: "Kode QR tidak bisa di-scan. Apa yang harus dilakukan?",
        answer: "Langkah troubleshoot:\n1. Pastikan kamera memiliki izin akses ke aplikasi\n2. Bersihkan lensa kamera HP\n3. Coba atur kecerahan layar HP Anda\n4. Pastikan QR code tidak rusak atau terpotong\n5. Minta business untuk menampilkan ulang QR code\n6. Coba gunakan HP lain jika masih tidak bisa.",
      },
      {
        question: "Jam check-in/out saya tidak tercatat. Bagaimana solusinya?",
        answer: "1. Pastikan Anda melakukan check-in/out menggunakan tombol di aplikasi, bukan hanya membuka QR code\n2. Cek koneksi internet saat melakukan check-in/out\n3. Jika jam tidak tercatat, hubungi business untuk konfirmasi manual\n4. Laporkan masalah ke tim support kami jika berulang.",
      },
      {
        question: "Saya lupa check-in/out. Apakah jam kerja tetap dihitung?",
        answer: "Tidak. Jika Anda lupa check-in atau check-out, jam kerja tidak akan tercatat otomatis.\n\nLangkah yang harus dilakukan:\n1. Hubungi business untuk konfirmasi kehadiran\n2. Mintalah business untuk merekam jam kerja Anda secara manual\n3. Kirim laporan ke tim support kami untuk pencatatan.",
      },
    ],
  },
  {
    title: "Wallet & Pembayaran",
    icon: Wallet,
    items: [
      {
        question: "Berapa batas minimum penarikan saldo?",
        answer: "Batas minimum penarikan saldo:\n• GoPay: Rp 10.000\n• OVO: Rp 10.000\n• Transfer Bank: Rp 50.000\n\nPastikan saldo Anda mencukupi batas minimum sebelum melakukan penarikan.",
      },
      {
        question: "Kapan saldo akan masuk setelah penarikan?",
        answer: "Waktu masuknya saldo:\n• GoPay: 1–2 menit\n• OVO: 1–2 menit\n• Transfer Bank: 1×24 jam kerja\n\nJika saldo belum masuk setelah waktu tersebut, hubungi tim support kami.",
      },
      {
        question: "Saya tidak bisa menarik saldo. Apa penyebabnya?",
        answer: "Kemungkinan penyebab:\n• Saldo kurang dari batas minimum penarikan\n• Akun bank atau e-wallet belum terverifikasi\n• Ada transaksi yang masih dalam proses\n• Limit penarikan harian sudah tercapai\n\nSolusi: Pastikan saldo cukup, verifikasi metode pembayaran, dan coba lagi nanti.",
      },
    ],
  },
  {
    title: "21-Hari & Aturan Kerja",
    icon: Award,
    items: [
      {
        question: "Apa itu aturan 21 hari dan mengapa saya tidak bisa melamar?",
        answer: "Aturan 21 hari adalah kebijakan yang melarang worker bekerja di bisnis yang sama lebih dari 21 hari dalam periode 30 hari.\n\nJika Anda melihat pesan \"违反 aturan 21 hari\", berarti Anda sudah bekerja di bisnis tersebut dalam 21 hari terakhir dan harus menunggu hingga 30 hari berlalu sebelum bisa melamar lagi di bisnis yang sama.",
      },
      {
        question: "Bagaimana cara mengecek riwayat kerja saya di suatu bisnis?",
        answer: "1. Buka halaman \"Bookings\" di aplikasi\n2. Filter berdasarkan nama bisnis\n3. Lihat daftar booking dan tanggal kerja Anda\n4. Total hari kerja akan terlihat di setiap booking\n\nAtau hubungi business untuk konfirmasi tanggal kerja Anda.",
      },
    ],
  },
  {
    title: "Notifikasi & Dukungan",
    icon: Bell,
    items: [
      {
        question: "Saya tidak menerima notifikasi. Apa yang harus dilakukan?",
        answer: "Langkah troubleshoot:\n1. Buka Pengaturan HP → Notifikasi → Pastikan Daily Worker Hub diizinkan\n2. Di aplikasi, buka Pengaturan → Notifikasi dan pastikan semua notifikasi diaktifkan\n3. Cek koneksi internet\n4. Pastikan aplikasi sudah diperbarui ke versi terbaru\n5. Coba logout dan login kembali.",
      },
      {
        question: "Bagaimana cara menghubungi tim support?",
        answer: "Hubungi tim support kami melalui:\n• Email: support@dwh.com\n• WhatsApp: +62 812-xxxx-xxxx\n• Jam operasional: Senin–Jumat, 09.00–17.00 WITA\n\nSertakan nama lengkap, nomor HP, dan deskripsi masalah untuk加快了 penanganan.",
      },
    ],
  },
];

export default function WorkerSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <WorkerSettingsContent />
    </Suspense>
  );
}

function WorkerSettingsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const activeTab = searchParams.get("tab");

  // Worker data state
  const [workerData, setWorkerData] = useState<{
    tier: WorkerTier;
    jobsCompleted: number;
    rating: number | null;
  } | null>(null);

  // FAQ open state — keyed by `${categoryIndex}-${itemIndex}`
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

  // Availability state
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([
    { dayOfWeek: 1, dayName: "Monday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 2, dayName: "Tuesday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 3, dayName: "Wednesday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 4, dayName: "Thursday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 5, dayName: "Friday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 6, dayName: "Saturday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 7, dayName: "Sunday", isAvailable: false, startHour: 9, endHour: 17 },
  ]);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Fetch worker data
        const { data: worker } = await (supabase as any)
          .from("workers")
          .select("id, tier, jobs_completed, rating")
          .eq("user_id", user.id)
          .single();

        if (worker) {
          setWorkerData({
            tier: worker.tier as WorkerTier,
            jobsCompleted: (worker as any).jobs_completed || 0,
            rating: worker.rating,
          });

          // Fetch availability
          const { data: availability } = await (supabase as any)
            .from("worker_availabilities")
            .select("*")
            .eq("worker_id", worker.id)
            .order("day_of_week");

          if (availability && availability.length > 0) {
            setAvailabilitySlots(availability.map((av: any) => ({
              dayOfWeek: av.day_of_week,
              dayName: DAY_NAMES[av.day_of_week],
              isAvailable: av.is_available,
              startHour: av.start_hour,
              endHour: av.end_hour,
            })));
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const name = user.user_metadata.full_name as string;
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Berhasil logout");
  };

  const handleAvailabilityToggle = (dayOfWeek: number) => {
    setAvailabilitySlots((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, isAvailable: !slot.isAvailable } : slot
      ),
    );
  };

  const handleAvailabilitySave = async () => {
    if (!workerData) return;
    setIsSavingAvailability(true);

    try {
      const result = await setWorkerAvailabilityForWeek(
        user?.id!,
        availabilitySlots.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startHour: slot.startHour,
          endHour: slot.endHour,
          isAvailable: slot.isAvailable,
        })),
      );

      if (result.success) {
        toast.success("Ketersediaan berhasil disimpan");
      } else {
        toast.error(result.errors?.join(", ") || "Gagal menyimpan");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Gagal menyimpan");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  // Render help tab content
  if (activeTab === "help") {
    return (
      <div className="min-h-screen bg-muted/30 pb-20 md:pb-6">
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/worker/settings" className="shrink-0">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-emerald-600" />
              <h1 className="text-lg font-semibold">Bantuan & FAQ</h1>
            </div>
          </div>

          <p className="text-sm text-muted-foreground px-1">
            Temukan jawaban untuk pertanyaan umum atau hubungi tim support kami.
          </p>

          {/* FAQ Categories */}
          {faqCategories.map((category, catIndex) => {
            const CategoryIcon = category.icon;
            return (
              <Card key={catIndex}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold">{category.title}</h2>
                  </div>
                  <div className="space-y-1">
                    {category.items.map((item, itemIndex) => {
                      const faqKey = `${catIndex}-${itemIndex}`;
                      const isOpen = !!openFaqs[faqKey];
                      return (
                        <Collapsible
                          key={itemIndex}
                          open={isOpen}
                          onOpenChange={(open) =>
                            setOpenFaqs((prev) => ({ ...prev, [faqKey]: open }))
                          }
                        >
                          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 transition-colors text-sm font-medium">
                            <span className="flex-1">{item.question}</span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-180"
                              )}
                            />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-3 pb-2.5">
                            <div className="rounded-lg bg-muted/40 p-3">
                              {item.answer.split("\n").map((line, lineIndex) => {
                                const trimmed = line.trim();
                                if (!trimmed) return null;
                                // Render numbered/bulleted lines as list items
                                if (/^\d+\.\s/.test(trimmed) || /^•\s/.test(trimmed)) {
                                  return (
                                    <p key={lineIndex} className="text-sm text-muted-foreground pl-2">
                                      {trimmed}
                                    </p>
                                  );
                                }
                                return (
                                  <p key={lineIndex} className="text-sm text-muted-foreground">
                                    {trimmed}
                                  </p>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Contact Support */}
          <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Tidak menemukan jawaban?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hubungi tim support kami via email di{" "}
                    <a href="mailto:support@dwh.com" className="text-emerald-600 dark:text-emerald-400 underline">
                      support@dwh.com
                    </a>{" "}
                    atau via WhatsApp. Jam operasional: Senin–Jumat, 09.00–17.00 WITA.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Profile Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-white/20">
                  <AvatarImage src={user?.user_metadata?.avatar_url as string} />
                  <AvatarFallback className="text-xl bg-white/20 text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">
                    {user?.user_metadata?.full_name as string || "User"}
                  </h2>
                  <p className="text-sm text-white/80">{user?.email}</p>
                  {workerData && (
                    <div className="flex items-center gap-2 mt-1">
                      <TierBadgeDetailed
                        tier={workerData.tier}
                        jobsCompleted={workerData.jobsCompleted}
                        rating={workerData.rating ?? undefined}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Availability Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Ketersediaan Mingguan</p>
                <p className="text-xs text-muted-foreground">Atur hari dan jam kerja</p>
              </div>
              <Button 
                size="sm" 
                onClick={handleAvailabilitySave}
                disabled={isSavingAvailability}
              >
                {isSavingAvailability ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {availabilitySlots.slice(0, 7).map((slot) => (
                <button
                  key={slot.dayOfWeek}
                  onClick={() => handleAvailabilityToggle(slot.dayOfWeek)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    slot.isAvailable 
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {slot.dayName.slice(0, 3)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Menu */}
        <Card>
          <CardContent className="p-2">
            {workerMenuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Bottom Menu */}
        <Card>
          <CardContent className="p-2">
            {bottomMenuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  href={item.href}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">{item.title}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full justify-start gap-3 h-12"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
