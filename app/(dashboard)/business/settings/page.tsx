"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Settings,
  Wallet,
  CalendarCheck,
  BarChart3,
  Star,
  Users,
  Clock,
  BadgeCheck,
  LogOut,
  ChevronRight,
  ChevronDown,
  User,
  Bell,
  Lock,
  HelpCircle,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Mail,
  FileText,
  CheckCircle,
  AlertTriangle,
  CalendarPlus,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

const businessMenuItems: MenuItem[] = [
  { title: "Profil Bisnis", href: "/business/settings", icon: User, description: "Informasi bisnis Anda" },
  { title: "Wallet", href: "/business/wallet", icon: Wallet, description: "Saldo dan transaksi" },
  { title: "Bookings", href: "/business/bookings", icon: CalendarCheck, description: "Riwayat pemesanan" },
  { title: "Analytics", href: "/business/analytics", icon: BarChart3, description: "Statistik bisnis" },
  { title: "Reviews", href: "/business/reviews", icon: Star, description: "Ulasan dari pekerja" },
  { title: "Workers", href: "/business/workers", icon: Users, description: "Kelola pekerja" },
  { title: "Job Attendance", href: "/business/job-attendance", icon: Clock, description: "Absensi pekerja" },
  { title: "Badge Verifications", href: "/business/badge-verifications", icon: BadgeCheck, description: "Verifikasi badge" },
];

const bottomMenuItems: MenuItem[] = [
  { title: "Notifikasi", href: "/business/settings?tab=notifications", icon: Bell },
  { title: "Keamanan", href: "/business/settings?tab=security", icon: Lock },
  { title: "Bantuan", href: "/business/settings?tab=help", icon: HelpCircle },
  { title: "Kebijakan", href: "/business/settings?tab=policy", icon: ExternalLink },
];

// FAQ data for the business help tab
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FAQItem[];
}

const businessFaqCategories: FAQCategory[] = [
  {
    title: "Akun & Login Bisnis",
    icon: User,
    items: [
      {
        question: "Saya tidak bisa login ke akun bisnis. Apa yang harus dilakukan?",
        answer: "Coba langkah-langkah berikut:\n1. Pastikan koneksi internet aktif\n2. Masukkan email dan password yang benar\n3. Klik \"Lupa Password\" dan cek email untuk reset\n4. Pastikan akun bisnis Anda tidak dinonaktifkan oleh admin\n5. Hubungi tim support jika masih bermasalah.",
      },
      {
        question: "Bagaimana cara mengubah informasi profil bisnis?",
        answer: "1. Login ke akun bisnis Anda\n2. Buka menu Pengaturan → Profil Bisnis\n3. Edit informasi yang ingin diubah (nama bisnis, alamat, deskripsi)\n4. Simpan perubahan\n\nBeberapa perubahan mungkin memerlukan verifikasi ulang.",
      },
    ],
  },
  {
    title: "Posting Lowongan",
    icon: CalendarPlus,
    items: [
      {
        question: "Mengapa lowongan saya tidak muncul di pasar kerja?",
        answer: "Kemungkinan penyebab:\n• Lowongan belum disetujui oleh tim kami\n• Lowongan sudah expired atau kuota terpenuhi\n• Ada kesalahan dalam detail lowongan\n•违反 aturan 21 hari untuk lowongan yang sama\n\nSolusi: Cek status lowongan di halaman \"Lowongan Saya\". Jika masih pending, tunggu persetujuan. Hubungi support jika ada masalah.",
      },
      {
        question: "Bagaimana cara membuat lowongan baru?",
        answer: "1. Buka menu \"Posting Lowongan\" di dashboard bisnis\n2. Isi detail lowongan: posisi, jumlah kebutuhan, tanggal kerja, lokasi, jam kerja, dan gaji\n3. Tambahkan persyaratan khusus jika ada\n4. Klik \"Posting\" untuk mengirimkan\n5. Tunggu persetujuan dari tim kami (1–2 hari kerja)\n6. Setelah disetujui, lowongan akan muncul di pasar kerja.",
      },
      {
        question: "Saya ingin mengedit atau menghapus lowongan. Bagaimana caranya?",
        answer: "1. Buka halaman \"Lowongan Saya\"\n2. Pilih lowongan yang ingin diedit\n3. Klik \"Edit\" untuk mengubah detail atau \"Hapus\" untuk menghapus\n\nCatatan: Jika sudah ada worker yang diterima, sebaiknya jangan hapus lowongan. Hubungi worker terlebih dahulu.",
      },
    ],
  },
  {
    title: "Pelamar & Kandidat",
    icon: UsersRound,
    items: [
      {
        question: "Bagaimana cara melihat dan memilih pelamar?",
        answer: "1. Buka menu \"Pelamar\" di dashboard\n2. Lihat daftar pelamar dengan profil, rating, dan badge mereka\n3. Klik profil pelamar untuk melihat detail pengalaman dan KYC\n4. Pilih pelamar yang sesuai dan klik \"Terima\" atau \"Tolak\"\n5. Pelamar akan menerima notifikasi tentang keputusan Anda.",
      },
      {
        question: "Mengapa saya tidak bisa menerima pelamar tertentu?",
        answer: "Kemungkinan penyebab:\n•违反 aturan 21 hari (pelamar sudah bekerja di bisnis Anda dalam 21 hari terakhir)\n• KYC pelamar belum disetujui\n• Kuota lowongan sudah terpenuhi\n• Lowongan sudah expired\n\nSolusi: Pilih pelamar lain yang memenuhi syarat.",
      },
      {
        question: "Bagaimana cara menolak pelamar dengan sopan?",
        answer: "1. Buka profil pelamar di halaman \"Pelamar\"\n2. Klik \"Tolak\"\n3. (Opsional) Tambahkan alasan penolakan\n4. Pelamar akan menerima notifikasi bahwa lamaran mereka ditolak\n\nTips: Memberikan umpan balik singkat membantu worker memperbaiki profil mereka.",
      },
    ],
  },
  {
    title: "Absensi Worker",
    icon: Clock,
    items: [
      {
        question: "Jam absen worker tidak tercatat. Apa yang harus dilakukan?",
        answer: "1. Pastikan worker melakukan check-in/out menggunakan aplikasi\n2. Cek koneksi internet worker saat melakukan absensi\n3. Buka halaman \"Absensi\" untuk melihat catatan\n4. Jika jam tidak tercatat, Anda bisa merekam secara manual:\n   - Buka detail booking worker\n   - Klik \"Tambah Catatan Manual\"\n   - Masukkan jam masuk dan keluar\n\nHubungi tim support jika masalah berulang.",
      },
      {
        question: "Bagaimana cara generate kode QR untuk check-in worker?",
        answer: "1. Buka halaman \"Absensi\" atau \"Booking\"\n2. Pilih booking worker yang ingin diaktifkan\n3. Klik \"Generate QR Code\"\n4. Tampilkan QR code di layar atau cetak untuk worker scan\n5. Worker akan scan QR code saat mulai dan selesai kerja\n\nPastikan QR code ditampilkan dengan jelas dan HP worker memiliki kamera yang berfungsi.",
      },
    ],
  },
  {
    title: "Wallet & Pembayaran",
    icon: Wallet,
    items: [
      {
        question: "Berapa biaya penggunaan platform Daily Worker Hub?",
        answer: "Biaya tergantung pada paket yang Anda pilih:\n• Paket Basic: Gratis, fitur terbatas\n• Paket Pro: Rp 99.000/bulan, fitur lengkap\n• Paket Enterprise: Hubungi tim sales untuk harga khusus\n\nBiaya admin tambahan mungkin berlaku untuk transaksi tertentu.",
      },
      {
        question: "Kapan saldo wallet bisnis akan dipotong setelah pekerja selesai kerja?",
        answer: "Saldo akan dipotong setelah:\n1. Worker menyelesaikan kerja dan melakukan check-out\n2. Anda mengkonfirmasi jam kerja worker\n3. Sistem menghitung total pembayaran\n4. Saldo dipotong dari wallet bisnis Anda\n\nProses ini biasanya memakan waktu 1×24 jam setelah worker menyelesaikan kerja.",
      },
      {
        question: "Saya tidak punya cukup saldo. Apa yang harus dilakukan?",
        answer: "1. Top up wallet bisnis melalui menu \"Wallet\"\n2. Pilih metode pembayaran (transfer bank, GoPay, OVO)\n3. Ikuti instruksi pembayaran\n4. Saldo akan masuk setelah pembayaran dikonfirmasi\n\nPastikan saldo cukup sebelum menerima worker baru.",
      },
    ],
  },
  {
    title: "Aturan 21 Hari untuk Bisnis",
    icon: AlertTriangle,
    items: [
      {
        question: "Apa itu aturan 21 hari untuk bisnis?",
        answer: "Aturan 21 hari melarang worker bekerja di bisnis yang sama lebih dari 21 hari dalam periode 30 hari. Kebijakan ini melindungi worker dari eksploitasi dan memastikan rotasi pekerjaan yang adil.\n\nJika Anda ingin mempekerjakan worker lebih dari 21 hari, pertimbangkan untuk membuat kontrak kerja langsung dengan worker tersebut di luar platform.",
      },
      {
        question: "Mengapa saya tidak bisa menerima worker tertentu karena aturan 21 hari?",
        answer: "Worker tersebut sudah bekerja di bisnis Anda selama 21 hari dalam 30 hari terakhir. Ini adalah kebijakan proteksi worker yang berlaku di seluruh platform.\n\nSolusi:\n• Tunggu hingga 30 hari berlalu untuk mempekerjakannya lagi\n• Pekerjakan worker lain yang memenuhi syarat\n• Hubungi tim support untuk kasus khusus",
      },
    ],
  },
  {
    title: "Hubungi Kami",
    icon: Mail,
    items: [
      {
        question: "Bagaimana cara menghubungi tim support bisnis?",
        answer: "Hubungi tim support kami melalui:\n• Email: business@dwh.com\n• WhatsApp Business: +62 812-xxxx-xxxx\n• Jam operasional: Senin–Jumat, 09.00–17.00 WITA\n\nSertakan nama bisnis, nomor akun, dan deskripsi masalah untuk加快 penanganan.",
      },
      {
        question: "Saya ingin upgrade ke paket Enterprise. Siapa yang harus dihubungi?",
        answer: "Hubungi tim sales kami:\n• Email: sales@dwh.com\n• WhatsApp: +62 812-xxxx-xxxx\n• Website: www.dwh.com/business\n\nTim sales kami siap membantu Anda menemukan paket yang paling sesuai dengan kebutuhan bisnis Anda.",
      },
    ],
  },
];

export default function BusinessSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <BusinessSettingsContent />
    </Suspense>
  );
}

function BusinessSettingsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const activeTab = searchParams.get("tab");

  // FAQ open state — keyed by `${categoryIndex}-${itemIndex}`
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) setIsLoading(false);
  }, [user]);

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

  // Render help tab content
  if (activeTab === "help") {
    return (
      <div className="min-h-screen bg-muted/30 pb-20 md:pb-6">
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/business/settings" className="inline-flex items-center justify-center rounded-lg hover:bg-muted hover:text-foreground size-11 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Bantuan & FAQ</h1>
            </div>
          </div>

          <p className="text-sm text-muted-foreground px-1">
            Temukan jawaban untuk pertanyaan umum atau hubungi tim support kami.
          </p>

          {/* FAQ Categories */}
          {businessFaqCategories.map((category, catIndex) => {
            const CategoryIcon = category.icon;
            return (
              <Card key={catIndex}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon className="h-4 w-4 text-primary" />
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
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Tidak menemukan jawaban?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hubungi tim support kami via email di{" "}
                    <a href="mailto:business@dwh.com" className="text-primary underline">
                      business@dwh.com
                    </a>{" "}
                    atau via WhatsApp Business. Jam operasional: Senin–Jumat, 09.00–17.00 WITA.
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
            <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
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
                  <p className="text-xs text-white/60 mt-1">Business Account</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Menu */}
        <Card>
          <CardContent className="p-2">
            {businessMenuItems.map((item, index) => {
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
