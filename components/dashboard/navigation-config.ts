import { Briefcase, Calendar, CheckCircle, Wallet, Users, MessageCircle } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export const workerNavItems: NavItem[] = [
  { href: "/worker/jobs", label: "Job Marketplace", icon: Briefcase },
  { href: "/worker/bookings", label: "Booking Saya", icon: Calendar },
  { href: "/worker/messages", label: "Pesan", icon: MessageCircle },
  { href: "/worker/attendance", label: "Absensi", icon: CheckCircle },
  { href: "/worker/wallet", label: "Dompet", icon: Wallet },
]

export const businessNavItems: NavItem[] = [
  { href: "/business/jobs", label: "Pekerjaan", icon: Briefcase },
  { href: "/business/job-attendance", label: "Kehadiran", icon: Users },
  { href: "/business/wallet", label: "Dompet", icon: Wallet },
]
