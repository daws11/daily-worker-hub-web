"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  CalendarCheck,
  Calendar,
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
  CalendarDays,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUnreadCount } from "@/lib/hooks/use-unread-count";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

// Navigation Groups for Business Users
const businessNavGroups = {
  main: [
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
  ],
  secondary: [
    {
      title: "Workers",
      href: "/business/workers",
      icon: Users,
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
      title: "Badge Verifications",
      href: "/business/badge-verifications",
      icon: BadgeCheck,
    },
  ],
  bottom: [
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
  ],
};

// Legacy flat array for backward compatibility
const businessNavItems: NavItem[] = [
  ...businessNavGroups.main,
  ...businessNavGroups.secondary,
  ...businessNavGroups.bottom,
];

// Navigation Groups for Worker Users
const workerNavGroups = {
  main: [
    {
      title: "Dashboard",
      href: "/worker",
      icon: LayoutDashboard,
    },
    {
      title: "Jobs",
      href: "/worker/jobs",
      icon: Briefcase,
    },
    {
      title: "Bookings",
      href: "/worker/bookings",
      icon: CalendarCheck,
    },
    {
      title: "Messages",
      href: "/worker/messages",
      icon: MessageSquare,
    },
  ],
  secondary: [
    {
      title: "Availability",
      href: "/worker/availability",
      icon: CalendarDays,
    },
    {
      title: "Badges",
      href: "/worker/badges",
      icon: BadgeCheck,
    },
    {
      title: "Achievements",
      href: "/worker/achievements",
      icon: Trophy,
    },
  ],
  bottom: [
    {
      title: "Wallet",
      href: "/worker/wallet",
      icon: Wallet,
    },
    {
      title: "Earnings",
      href: "/worker/earnings",
      icon: Wallet,
    },
    {
      title: "Settings",
      href: "/worker/settings",
      icon: Settings,
    },
  ],
};

// Legacy flat array for backward compatibility
const workerNavItems: NavItem[] = [
  ...workerNavGroups.main,
  ...workerNavGroups.secondary,
  ...workerNavGroups.bottom,
];

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: NavItem[];
  className?: string;
  collapsed?: boolean;
  groups?: {
    main: NavItem[];
    secondary: NavItem[];
    bottom: NavItem[];
  };
}

function NavItemComponent({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  const isActive =
    pathname === item.href || pathname?.startsWith(item.href + "/");
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] touch-manipulation",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180",
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
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative min-h-[44px] touch-manipulation",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
  );
}

function SidebarContent({
  items,
  collapsed,
}: {
  items: NavItem[];
  collapsed?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((item) => (
        <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
      ))}
    </nav>
  );
}

// Grouped sidebar content with collapsible sections
function GroupedSidebarContent({
  groups,
  collapsed,
}: {
  groups: {
    main: NavItem[];
    secondary: NavItem[];
    bottom: NavItem[];
  };
  collapsed?: boolean;
}) {
  const [isSecondaryOpen, setIsSecondaryOpen] = React.useState(false);

  return (
    <nav className="flex flex-col h-full">
      {/* Main Section - Always Visible */}
      <div className="space-y-1 p-2">
        {groups.main.map((item) => (
          <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
        ))}
      </div>

      {/* Secondary Section - Collapsible */}
      {groups.secondary.length > 0 && (
        <div className="px-2 py-2 border-t border-border">
          <Collapsible open={isSecondaryOpen} onOpenChange={setIsSecondaryOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] touch-manipulation",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    isSecondaryOpen && "rotate-90",
                  )}
                />
                {!collapsed && (
                  <span className="flex-1 text-left">More</span>
                )}
              </button>
            </CollapsibleTrigger>
            {!collapsed && (
              <CollapsibleContent className="space-y-1 pt-1">
                {groups.secondary.map((item) => (
                  <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
                ))}
              </CollapsibleContent>
            )}
          </Collapsible>
        </div>
      )}

      {/* Bottom Section - Always Visible */}
      <div className="mt-auto border-t border-border p-2 space-y-1">
        {groups.bottom.map((item) => (
          <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
        ))}
      </div>
    </nav>
  );
}

export function SidebarNav({
  items = businessNavItems,
  className,
  collapsed,
  groups,
  ...props
}: SidebarNavProps) {
  return (
    <ScrollArea className={cn("h-full", className)} {...props}>
      {groups ? (
        <GroupedSidebarContent groups={groups} collapsed={collapsed} />
      ) : (
        <SidebarContent items={items} collapsed={collapsed} />
      )}
    </ScrollArea>
  );
}

export function MobileSidebarNav({
  items = businessNavItems,
  className,
  groups,
}: Omit<SidebarNavProps, "collapsed">) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-11 w-11 shrink-0 touch-manipulation"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-72 p-0 z-[100]">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-left">Navigation</SheetTitle>
          </SheetHeader>
          <div className={cn("h-[calc(100vh-4rem)] overflow-y-auto", className)}>
            {groups ? (
              <GroupedSidebarContent groups={groups} />
            ) : (
              <SidebarContent items={items} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export { businessNavItems, workerNavItems, businessNavGroups, workerNavGroups, type NavItem };

// Badge-aware sidebar wrapper for Messages unread count

function applyMessagesBadge(
  groups: typeof businessNavGroups,
  unreadCount: number,
): typeof businessNavGroups {
  return {
    main: groups.main.map((item) => {
      if (item.href.includes("/messages")) {
        return {
          ...item,
          badge: unreadCount > 0 ? unreadCount : undefined,
        };
      }
      return item;
    }),
    secondary: groups.secondary,
    bottom: groups.bottom,
  };
}

export function BusinessSidebarNav(props: Omit<SidebarNavProps, "groups">) {
  const { unreadCount } = useUnreadCount();
  const groups = applyMessagesBadge(businessNavGroups, unreadCount);
  return <SidebarNav {...props} groups={groups} />;
}

export function WorkerSidebarNav(props: Omit<SidebarNavProps, "groups">) {
  const { unreadCount } = useUnreadCount();
  const groups = applyMessagesBadge(workerNavGroups, unreadCount);
  return <SidebarNav {...props} groups={groups} />;
}
