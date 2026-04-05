"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Wallet,
  CalendarCheck,
  CreditCard,
  Star,
  BarChart3,
  Users,
  Clock,
  Award,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Briefcase,
  MessageSquare,
  Home,
  BadgeCheck,
} from "lucide-react";

interface ProfileMenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const businessMenuItems: ProfileMenuItem[] = [
  { title: "Wallet", href: "/business/wallet", icon: Wallet },
  { title: "Bookings", href: "/business/bookings", icon: CalendarCheck },
  { title: "Analytics", href: "/business/analytics", icon: BarChart3 },
  { title: "Reviews", href: "/business/reviews", icon: Star },
  { title: "Workers", href: "/business/workers", icon: Users },
  // Attendance removed
  // Badge Verifications removed
  { title: "Settings", href: "/business/settings", icon: Settings },
];

const workerMenuItems: ProfileMenuItem[] = [
  { title: "Wallet", href: "/worker/wallet", icon: Wallet },
  { title: "Bookings", href: "/worker/bookings", icon: CalendarCheck },
  { title: "Earnings", href: "/worker/earnings", icon: CreditCard },
  { title: "Applications", href: "/worker/applications", icon: Briefcase },
  { title: "Badges", href: "/worker/badges", icon: Award },
  // Attendance removed
  { title: "Availability", href: "/worker/availability", icon: CalendarCheck },
  { title: "Settings", href: "/worker/settings", icon: Settings },
];

interface MobileProfileMenuProps {
  role: "business" | "worker";
}

export function MobileProfileMenu({ role }: MobileProfileMenuProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);
  
  const menuItems = role === "business" ? businessMenuItems : workerMenuItems;
  const isActive = pathname?.startsWith("/business/settings") || pathname?.startsWith("/worker/settings");

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

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full touch-manipulation",
            "transition-all duration-200",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Avatar className="h-6 w-6 mb-1">
            <AvatarImage src={user?.user_metadata?.avatar_url as string} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">Profile</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        className="w-80 p-0 ml-16 md:hidden"
        align="start"
      >
        {/* User Info Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.user_metadata?.avatar_url as string} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {user?.user_metadata?.full_name as string || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-primary font-medium mt-0.5">
              {role === "business" ? "Business Account" : "Worker Account"}
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2 max-h-[60vh] overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg",
                  "transition-colors hover:bg-muted",
                  isItemActive && "bg-primary/10 text-primary"
                )}
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 font-medium text-sm">{item.title}</span>
                {item.badge && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="border-t py-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 mx-2 w-full rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
