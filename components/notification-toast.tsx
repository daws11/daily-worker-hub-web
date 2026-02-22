"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { Bell } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const NotificationToast = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          icon: "group-[.toast]:text-muted-foreground",
        },
      }}
      icons={{
        success: <Bell className="h-5 w-5 text-green-500" />,
        error: <Bell className="h-5 w-5 text-red-500" />,
        info: <Bell className="h-5 w-5 text-blue-500" />,
        warning: <Bell className="h-5 w-5 text-yellow-500" />,
      }}
      {...props}
    />
  )
}

export { NotificationToast }
