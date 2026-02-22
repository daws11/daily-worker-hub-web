"use client"

import * as React from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DashboardHeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <span className="text-xs font-bold text-primary-foreground">DW</span>
      </div>
      <span className="font-semibold text-lg">
        Daily<span className="text-primary">Worker</span>
      </span>
    </header>
  )
}
