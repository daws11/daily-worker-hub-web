"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Briefcase,
  CalendarCheck,
  MessageSquare,
  User,
} from "lucide-react";

interface MobileNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const businessMobileNav: MobileNavItem[] = [
  {
    title: "Home",
    href: "/business",
    icon: Home,
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
    title: "Profile",
    href: "/business/settings",
    icon: User,
  },
];

const workerMobileNav: MobileNavItem[] = [
  {
    title: "Home",
    href: "/worker",
    icon: Home,
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
  {
    title: "Profile",
    href: "/worker/settings",
    icon: User,
  },
];

interface MobileBottomNavProps {
  role: "business" | "worker";
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = role === "business" ? businessMobileNav : workerMobileNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full touch-manipulation",
                "transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export { businessMobileNav, workerMobileNav };
