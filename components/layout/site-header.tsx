"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { MobileSidebarNav } from "./sidebar-nav";
import {
  Bell,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  User,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  showSearch?: boolean;
}

// Map path segments to readable labels
const pathLabels: Record<string, string> = {
  business: "Business",
  jobs: "Jobs",
  bookings: "Bookings",
  messages: "Messages",
  "job-attendance": "Attendance",
  reviews: "Reviews",
  workers: "Workers",
  "badge-verifications": "Badge Verifications",
  analytics: "Analytics",
  wallet: "Wallet",
  settings: "Settings",
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      label:
        pathLabels[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1),
      href: currentPath,
    });
  }

  // Remove href from last item (current page)
  if (breadcrumbs.length > 1) {
    const last = breadcrumbs[breadcrumbs.length - 1];
    delete last.href;
  }

  return breadcrumbs;
}

export function SiteHeader({
  breadcrumbs,
  showBreadcrumbs = true,
  showSearch = false,
  className,
  ...props
}: SiteHeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-generate breadcrumbs if not provided
  const crumbs =
    breadcrumbs || (showBreadcrumbs ? generateBreadcrumbs(pathname) : []);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  // Get user initials
  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const name = user.user_metadata.full_name as string;
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
      {...props}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Mobile menu + Breadcrumbs */}
        <div className="flex items-center gap-2">
          <MobileSidebarNav />

          {showBreadcrumbs && crumbs.length > 0 && (
            <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              {crumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRight className="h-4 w-4" />}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Logo for mobile when no breadcrumbs */}
          {(!showBreadcrumbs || crumbs.length === 0) && (
            <Link
              href="/business"
              className="flex items-center gap-2 md:hidden"
            >
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-semibold">Daily Worker Hub</span>
            </Link>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search (optional) */}
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-11 w-11"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="sr-only">Search</span>
            </Button>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11 touch-manipulation"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* Theme Toggle */}
          <div className="touch-manipulation">
            <ThemeToggle variant="button" />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                className="relative h-11 w-11 rounded-full touch-manipulation"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url as string | undefined}
                    alt={user?.user_metadata?.full_name || "User"}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/business" className="flex items-center">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/business/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
