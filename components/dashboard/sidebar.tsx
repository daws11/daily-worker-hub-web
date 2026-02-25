"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@/app/providers/auth-provider"
import { useMessages } from "@/lib/hooks/use-messages"
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { SidebarItem } from "./sidebar-item"
import { UserMenu } from "./user-menu"
import { workerNavItems, businessNavItems } from "./navigation-config"
import { Briefcase } from "lucide-react"
import type { NavItem } from "./navigation-config"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { user, userRole } = useAuth()
  const { unreadCount, fetchUnreadCount } = useMessages({
    userId: user?.id,
    autoFetch: true,
  })

  // Subscribe to realtime message updates for the current user
  // This refreshes the unread count badge when new messages arrive
  useRealtimeMessages(
    { receiverId: user?.id, enabled: !!user?.id },
    {
      onMessageChange: async () => {
        // Refresh unread count when any message change occurs
        await fetchUnreadCount()
      },
    }
  )

  const navItems = React.useMemo(() => {
    const baseItems = userRole === "worker" ? workerNavItems : businessNavItems

    return baseItems.map((item) => {
      // Add unread badge to Messages menu item
      if (item.href === "/worker/messages" || item.href === "/business/messages") {
        return { ...item, badge: unreadCount }
      }
      return item
    })
  }, [userRole, unreadCount])

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col border-r bg-background",
        className
      )}
    >
      {/* Brand/Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Briefcase className="h-5 w-5 text-primary-foreground" />
        </div>
        <Link href="/" className="font-semibold text-lg">
          Daily<span className="text-primary">Worker</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <SidebarItem key={item.href} {...item} />
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Menu */}
      <UserMenu />
    </div>
  )
}
