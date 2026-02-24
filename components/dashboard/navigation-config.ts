import { BarChart, Briefcase, Calendar, CheckCircle, Wallet, Users } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const workerNavItems: NavItem[] = [
  { href: "/worker/jobs", label: "Job Marketplace", icon: Briefcase },
  { href: "/worker/bookings", label: "Booking Saya", icon: Calendar },
  { href: "/worker/attendance", label: "Absensi", icon: CheckCircle },
  { href: "/worker/wallet", label: "Dompet", icon: Wallet },
]

export const businessNavItems: NavItem[] = [
  { href: "/business/jobs", label: "Pekerjaan", icon: Briefcase },
  { href: "/business/job-attendance", label: "Kehadiran", icon: Users },
  { href: "/business/wallet", label: "Dompet", icon: Wallet },
]

export const adminNavItems: NavItem[] = [
  { href: "/admin/analytics", label: "Analitik Platform", icon: BarChart },
]
