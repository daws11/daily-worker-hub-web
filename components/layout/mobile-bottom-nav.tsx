"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  Briefcase,
  MessageSquare,
  User,
} from "lucide-react";

interface MobileNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const businessMobileNav: MobileNavItem[] = [
  { title: "Home", href: "/business", icon: Home },
  { title: "Jobs", href: "/business/jobs", icon: Briefcase },
  { title: "Messages", href: "/business/messages", icon: MessageSquare },
  { title: "Profile", href: "/business/settings", icon: User },
];

const workerMobileNav: MobileNavItem[] = [
  { title: "Home", href: "/worker", icon: Home },
  { title: "Jobs", href: "/worker/jobs", icon: Briefcase },
  { title: "Messages", href: "/worker/messages", icon: MessageSquare },
  { title: "Profile", href: "/worker/settings", icon: User },
];

interface MobileBottomNavProps {
  role: "business" | "worker";
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const userRole = role || (user?.user_metadata?.role as string) || "worker";
  const items = userRole === "business" ? businessMobileNav : workerMobileNav;

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const name = user.user_metadata.full_name as string;
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          // Special rendering for Profile tab
          if (item.title === "Profile") {
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
                <Avatar className="h-6 w-6 mb-1">
                  <AvatarImage src={user?.user_metadata?.avatar_url as string} />
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{item.title}</span>
              </Link>
            );
          }

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
      </div>
    </nav>
  );
}

export { businessMobileNav, workerMobileNav };
