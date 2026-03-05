"use client"

import * as React from "react"
import { Bell, Check, Filter, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  body: string
  link?: string | null
  is_read: boolean
  created_at: string
}

type FilterType = "all" | "unread" | "read"

interface NotificationListProps {
  initialNotifications?: Notification[]
  onFetchNotifications?: (filter?: FilterType) => Promise<Notification[]>
  onMarkAsRead?: (notificationId: string) => Promise<void>
  onMarkAllAsRead?: () => Promise<void>
  onDeleteNotification?: (notificationId: string) => Promise<void>
}

export function NotificationList({
  initialNotifications = [],
  onFetchNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
}: NotificationListProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications)
  const [filter, setFilter] = React.useState<FilterType>("all")
  const [isLoading, setIsLoading] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  // Fetch notifications on mount and filter change
  React.useEffect(() => {
    if (onFetchNotifications) {
      setIsLoading(true)
      onFetchNotifications(filter === "all" ? undefined : filter)
        .then(setNotifications)
        .finally(() => setIsLoading(false))
    }
  }, [filter, onFetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAsRead = async (notificationId: string) => {
    if (onMarkAsRead) {
      setActionLoading(notificationId)
      try {
        await onMarkAsRead(notificationId)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        )
      } finally {
        setActionLoading(null)
      }
    }
  }

  const handleMarkAllAsRead = async () => {
    if (onMarkAllAsRead) {
      setActionLoading("mark-all")
      try {
        await onMarkAllAsRead()
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      } finally {
        setActionLoading(null)
      }
    }
  }

  const handleDelete = async (notificationId: string) => {
    if (onDeleteNotification) {
      setActionLoading(`delete-${notificationId}`)
      try {
        await onDeleteNotification(notificationId)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      } finally {
        setActionLoading(null)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Baru saja"
    if (minutes < 60) return `${minutes} menit lalu`
    if (hours < 24) return `${hours} jam lalu`
    if (days < 7) return `${days} hari lalu`
    return formatDate(dateString)
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read
    if (filter === "read") return n.is_read
    return true
  })

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifikasi
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="status" status="info">
                {unreadCount} belum dibaca
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              <Button
                variant={filter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter("all")}
                className="h-8 px-3"
              >
                Semua
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter("unread")}
                className="h-8 px-3"
              >
                Belum Dibaca
              </Button>
              <Button
                variant={filter === "read" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter("read")}
                className="h-8 px-3"
              >
                Dibaca
              </Button>
            </div>

            {/* Mark all as read button */}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={actionLoading === "mark-all"}
                className="h-8"
              >
                {actionLoading === "mark-all" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Tandai Semua Dibaca
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Bell className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium">
              {filter === "unread"
                ? "Tidak ada notifikasi belum dibaca"
                : filter === "read"
                ? "Tidak ada notifikasi yang sudah dibaca"
                : "Tidak ada notifikasi"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "all"
                ? "Notifikasi baru akan muncul di sini"
                : "Coba ubah filter untuk melihat notifikasi lain"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 hover:bg-gray-50 transition-colors",
                  !notification.is_read && "bg-blue-50/30"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Unread indicator */}
                  <div className="pt-1">
                    {!notification.is_read ? (
                      <span className="block h-3 w-3 rounded-full bg-blue-600" />
                    ) : (
                      <span className="block h-3 w-3 rounded-full bg-gray-300" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4
                          className={cn(
                            "text-base",
                            !notification.is_read
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          )}
                        >
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={actionLoading === notification.id}
                            className="h-8 w-8"
                            title="Tandai sebagai dibaca"
                          >
                            {actionLoading === notification.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        )}
                        {onDeleteNotification && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(notification.id)}
                            disabled={actionLoading === `delete-${notification.id}`}
                            className="h-8 w-8"
                            title="Hapus notifikasi"
                          >
                            {actionLoading === `delete-${notification.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Link button */}
                    {notification.link && (
                      <a
                        href={notification.link}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium"
                      >
                        Lihat detail →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationList
