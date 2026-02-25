import { Award, BarChart, Briefcase, Calendar, CheckCircle, TrendingUp, Wallet, Users, Settings, MessageCircle } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const workerNavItems: NavItem[] = [
  { href: "/worker/jobs", label: "Job Marketplace", icon: Briefcase },
  { href: "/worker/bookings", label: "Booking Saya", icon: Calendar },
  { href: "/worker/messages", label: "Pesan", icon: MessageCircle },
  { href: "/worker/attendance", label: "Absensi", icon: CheckCircle },
  { href: "/worker/wallet", label: "Dompet", icon: Wallet },
  { href: "/worker/badges", label: "Badges", icon: Award },
  { href: "/worker/settings", label: "Pengaturan", icon: Settings },
]

export const businessNavItems: NavItem[] = [
  { href: "/business/jobs", label: "Pekerjaan", icon: Briefcase },
  { href: "/business/messages", label: "Pesan", icon: MessageCircle },
  { href: "/business/job-attendance", label: "Kehadiran", icon: Users },
  { href: "/business/workers", label: "Pekerja", icon: Users },
  { href: "/business/badge-verifications", label: "Verifikasi Badge", icon: Award },
  { href: "/business/wallet", label: "Dompet", icon: Wallet },
  { href: "/business/settings", label: "Pengaturan", icon: Settings },
]

export const adminNavItems: NavItem[] = [
  { href: "/admin/analytics", label: "Analitik Platform", icon: BarChart },
]