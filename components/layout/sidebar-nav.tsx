"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MessageSquare,
  CalendarCheck,
  Briefcase,
  Star,
  BadgeCheck,
  Wallet,
  Settings,
  BarChart3,
  Users,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavItem[]
}

const businessNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/business",
    icon: LayoutDashboard,
  },
  {
    title: "Jobs",
    href: "/business/jobs",
    icon: Briefcase,
  },
  {
    title: "Bookings",
    href: "/business/bookings",
    icon: CalendarCheck,
  },
  {
    title: "Messages",
    href: "/business/messages",
    icon: MessageSquare,
  },
  {
    title: "Attendance",
    href: "/business/job-attendance",
    icon: Users,
  },
  {
    title: "Reviews",
    href: "/business/reviews",
    icon: Star,
  },
  {
    title: "Workers",
    href: "/business/workers",
    icon: Users,
  },
  {
    title: "Badge Verifications",
    href: "/business/badge-verifications",
    icon: BadgeCheck,
  },
  {
    title: "Analytics",
    href: "/business/analytics",
    icon: BarChart3,
  },
  {
    title: "Wallet",
    href: "/business/wallet",
    icon: Wallet,
  },
  {
    title: "Settings",
    href: "/business/settings",
    icon: Settings,
  },
]

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: NavItem[]
  className?: string
  collapsed?: boolean
}

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed?: boolean }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  
  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
  const Icon = item.icon
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </button>
        </CollapsibleTrigger>
        {!collapsed && (
          <CollapsibleContent className="pl-7 pt-1">
            {item.children!.map((child) => (
              <NavItemComponent key={child.href} item={child} />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
      {collapsed && item.badge && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function SidebarContent({ items, collapsed }: { items: NavItem[]; collapsed?: boolean }) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((item) => (
        <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
      ))}
    </nav>
  )
}

export function SidebarNav({
  items = businessNavItems,
  className,
  collapsed,
  ...props
}: SidebarNavProps) {
  return (
    <ScrollArea className={cn("h-full", className)} {...props}>
      <SidebarContent items={items} collapsed={collapsed} />
    </ScrollArea>
  )
}

export function MobileSidebarNav({
  items = businessNavItems,
  className,
}: Omit<SidebarNavProps, "collapsed">) {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>
        <div className={cn("h-[calc(100vh-4rem)]", className)}>
          <SidebarContent items={items} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { businessNavItems, type NavItem }
