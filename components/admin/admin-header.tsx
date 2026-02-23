"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/providers/auth-provider"
import { LogOut, Shield } from "lucide-react"

interface AdminHeaderProps extends React.HTMLAttributes<HTMLElement> {
  className?: string
}

const AdminHeader = React.forwardRef<HTMLElement, AdminHeaderProps>(
  ({ className, ...props }, ref) => {
    const { user, signOut } = useAuth()
    const router = useRouter()

    const handleLogout = async () => {
      await signOut()
      router.push("/")
    }

    // Get admin initials from email or name
    const getInitials = () => {
      if (user?.user_metadata?.full_name) {
        const name = user.user_metadata.full_name as string
        return name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      }
      if (user?.email) {
        return user.email.slice(0, 2).toUpperCase()
      }
      return "AD"
    }

    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...props}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Daily Worker Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.full_name || "Admin"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "admin@dailyworker.id"}
                </p>
              </div>
              <Avatar>
                <AvatarImage src={user?.user_metadata?.avatar_url as string | undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
    )
  }
)

AdminHeader.displayName = "AdminHeader"

export { AdminHeader }
