"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Settings, 
  Wallet, 
  CalendarCheck, 
  BarChart3, 
  Star, 
  Users, 
  Clock,
  BadgeCheck,
  LogOut,
  ChevronRight,
  User,
  Bell,
  Lock,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

const businessMenuItems: MenuItem[] = [
  { title: "Profil Bisnis", href: "/business/settings", icon: User, description: "Informasi bisnis Anda" },
  { title: "Wallet", href: "/business/wallet", icon: Wallet, description: "Saldo dan transaksi" },
  { title: "Bookings", href: "/business/bookings", icon: CalendarCheck, description: "Riwayat pemesanan" },
  { title: "Analytics", href: "/business/analytics", icon: BarChart3, description: "Statistik bisnis" },
  { title: "Reviews", href: "/business/reviews", icon: Star, description: "Ulasan dari pekerja" },
  { title: "Workers", href: "/business/workers", icon: Users, description: "Kelola pekerja" },
  { title: "Job Attendance", href: "/business/job-attendance", icon: Clock, description: "Absensi pekerja" },
  { title: "Badge Verifications", href: "/business/badge-verifications", icon: BadgeCheck, description: "Verifikasi badge" },
];

const bottomMenuItems: MenuItem[] = [
  { title: "Notifikasi", href: "/business/settings?tab=notifications", icon: Bell },
  { title: "Keamanan", href: "/business/settings?tab=security", icon: Lock },
  { title: "Bantuan", href: "/business/settings?tab=help", icon: HelpCircle },
  { title: "Kebijakan", href: "/business/settings?tab=policy", icon: ExternalLink },
];

export default function BusinessSettingsPage() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) setIsLoading(false);
  }, [user]);

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
    toast.success("Berhasil logout");
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Profile Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-white/20">
                  <AvatarImage src={user?.user_metadata?.avatar_url as string} />
                  <AvatarFallback className="text-xl bg-white/20 text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">
                    {user?.user_metadata?.full_name as string || "User"}
                  </h2>
                  <p className="text-sm text-white/80">{user?.email}</p>
                  <p className="text-xs text-white/60 mt-1">Business Account</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Menu */}
        <Card>
          <CardContent className="p-2">
            {businessMenuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Bottom Menu */}
        <Card>
          <CardContent className="p-2">
            {bottomMenuItems.map((item, index) => {
              const Icon = item.icon;
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">{item.title}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full justify-start gap-3 h-12"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
