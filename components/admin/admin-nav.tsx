"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Building2,
  HardHat,
  Briefcase,
  FileCheck,
  Scale,
  BarChart3,
  Activity,
  ScrollText,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Overview and metrics",
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    description: "Manage all users",
  },
  {
    title: "Businesses",
    href: "/admin/businesses",
    icon: Building2,
    description: "Business verification",
  },
  {
    title: "Workers",
    href: "/admin/workers",
    icon: HardHat,
    description: "Worker management",
  },
  {
    title: "Jobs",
    href: "/admin/jobs",
    icon: Briefcase,
    description: "Job moderation",
  },
  {
    title: "KYC Verifications",
    href: "/admin/kycs",
    icon: FileCheck,
    description: "KYC approval",
  },
  {
    title: "Disputes",
    href: "/admin/disputes",
    icon: Scale,
    description: "Dispute resolution",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "Platform analytics",
  },
  {
    title: "System Health",
    href: "/admin/health",
    icon: Activity,
    description: "System monitoring",
  },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    icon: ScrollText,
    description: "Admin activity logs",
  },
]

interface AdminNavProps extends React.HTMLAttributes<HTMLElement> {
  className?: string
}

const AdminNav = React.forwardRef<HTMLElement, AdminNavProps>(
  ({ className, ...props }, ref) => {
    const pathname = usePathname()

    return (
      <nav ref={ref} className={cn("flex flex-col gap-1", className)} {...props}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.title}</span>
            </Link>
          )
        })}
      </nav>
    )
  }
)

AdminNav.displayName = "AdminNav"

export { AdminNav, type NavItem }
