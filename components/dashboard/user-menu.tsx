"use client"

import * as React from "react"
import { useAuth } from "@/app/providers/auth-provider"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut } from "lucide-react"

export function UserMenu() {
  const { user, signOut, isLoading } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getUserInitials = () => {
    if (!user?.email) return "U"
    const email = user.email
    const name = email.split("@")[0]
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="flex items-center gap-3 border-t p-4">
      <Avatar className="h-9 w-9">
        <AvatarImage src={user?.user_metadata?.avatar_url} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {getUserInitials()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {user?.email}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        disabled={isLoggingOut || isLoading}
        title="Logout"
      >
        {isLoggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        <span className="sr-only">Logout</span>
      </Button>
    </div>
  )
}
