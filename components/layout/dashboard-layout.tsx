"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SiteHeader } from "./site-header"
import { SidebarNav, businessNavItems } from "./sidebar-nav"
import { Button } from "@/components/ui/button"
import { PanelLeftClose, PanelLeft } from "lucide-react"

interface DashboardLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  sidebarItems?: typeof businessNavItems
  headerProps?: React.ComponentProps<typeof SiteHeader>
  collapsible?: boolean
}

export function DashboardLayout({
  children,
  sidebarItems = businessNavItems,
  headerProps,
  collapsible = true,
  className,
  ...props
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className={cn("min-h-screen bg-background", className)} {...props}>
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r bg-muted/30 transition-all duration-300",
            collapsed ? "w-[60px]" : "w-64"
          )}
        >
          {/* Sidebar Header */}
          <div className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed && "justify-center px-2"
          )}>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">DW</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Daily Worker</span>
                  <span className="text-xs text-muted-foreground">Business Hub</span>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">DW</span>
              </div>
            )}
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 overflow-hidden">
            <SidebarNav items={sidebarItems} collapsed={collapsed} />
          </div>

          {/* Collapse Toggle */}
          {collapsible && (
            <div className={cn(
              "border-t p-2",
              collapsed && "flex justify-center"
            )}>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                onClick={() => setCollapsed(!collapsed)}
                className={cn(!collapsed && "w-full justify-start")}
              >
                {collapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <>
                    <PanelLeftClose className="mr-2 h-4 w-4" />
                    Collapse
                  </>
                )}
              </Button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <SiteHeader {...headerProps} />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
