"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavItem } from "./navigation-config"
import { UnreadBadge } from "@/components/messaging/unread-badge"

interface SidebarItemProps extends NavItem {
  onClose?: () => void
}

export function SidebarItem({
  href,
  label,
  icon: Icon,
  badge,
  onClose,
}: SidebarItemProps) {
  const pathname = usePathname()

  const isActive = pathname === href || pathname?.startsWith(href + "/")

  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4", isActive && "text-accent-foreground")} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <UnreadBadge count={badge} size="sm" />
      )}
    </Link>
  )
}
