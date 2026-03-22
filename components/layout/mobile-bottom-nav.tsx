"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers/auth-provider";
import {
  Home,
  Briefcase,
  MessageSquare,
} from "lucide-react";
import { MobileProfileMenu } from "./mobile-profile-menu";

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
    title: "Messages",
    href: "/business/messages",
    icon: MessageSquare,
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
    title: "Messages",
    href: "/worker/messages",
    icon: MessageSquare,
  },
];

interface MobileBottomNavProps {
  role: "business" | "worker";
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Determine user role from metadata or default
  const userRole = role || (user?.user_metadata?.role as string) || "worker";
  const items = userRole === "business" ? businessMobileNav : workerMobileNav;

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
                "transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1 font-medium">{item.title}</span>
            </Link>
          );
        })}
        
        {/* Profile with Menu */}
        <MobileProfileMenu role={userRole} />
      </div>
    </nav>
  );
}

export { businessMobileNav, workerMobileNav };
