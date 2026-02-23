"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getSocialConnections,
  disconnectSocialPlatform,
  type SocialConnectionListResult,
} from "@/lib/actions/social"
import type {
  BusinessSocialConnectionWithPlatform,
  SocialPlatformType,
} from "@/lib/types/social"

// Social platform configuration
export const SOCIAL_PLATFORMS: Record<
  SocialPlatformType,
  {
    name: string
    description: string
    icon: string
    color: string
    borderColor: string
  }
> = {
  instagram: {
    name: "Instagram",
    description: "Share jobs as visual posts with hashtags",
    icon: "📸",
    color: "text-pink-600",
    borderColor: "border-pink-200",
  },
  facebook: {
    name: "Facebook",
    description: "Post jobs to your Facebook page",
    icon: "📘",
    color: "text-blue-600",
    borderColor: "border-blue-200",
  },
  linkedin: {
    name: "LinkedIn",
    description: "Share professional job postings",
    icon: "💼",
    color: "text-blue-700",
    borderColor: "border-blue-300",
  },
  twitter: {
    name: "X (Twitter)",
    description: "Share quick job updates",
    icon: "🐦",
    color: "text-gray-700",
    borderColor: "border-gray-300",
  },
}

export interface SocialPlatformConnectProps {
  businessId: string
  onConnectionChange?: (connections: BusinessSocialConnectionWithPlatform[]) => void
  className?: string
}

export function SocialPlatformConnect({
  businessId,
  onConnectionChange,
  className,
}: SocialPlatformConnectProps) {
  const router = useRouter()
  const [connections, setConnections] = React.useState<
    BusinessSocialConnectionWithPlatform[]
  >([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDisconnecting, setIsDisconnecting] = React.useState<string | null>(
    null
  )
  const [error, setError] = React.useState<string | null>(null)

  // Fetch connections on mount
  React.useEffect(() => {
    const fetchConnections = async () => {
      setIsLoading(true)
      setError(null)

      const result: SocialConnectionListResult =
        await getSocialConnections(businessId, { status: "active" })

      if (result.success && result.data) {
        setConnections(result.data)
        onConnectionChange?.(result.data)
      } else if (result.error) {
        setError(result.error)
      }

      setIsLoading(false)
    }

    fetchConnections()
  }, [businessId, onConnectionChange])

  // Get connection for a specific platform
  const getConnectionForPlatform = (
    platformType: SocialPlatformType
  ): BusinessSocialConnectionWithPlatform | undefined => {
    return connections.find(
      (c) => c.platform?.platform_type === platformType && c.status === "active"
    )
  }

  // Handle OAuth connect
  const handleConnect = async (platformType: SocialPlatformType) => {
    try {
      // Open OAuth flow in popup
      const width = 600
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      const popup = window.open(
        `/api/social/auth/${platformType}?business_id=${businessId}`,
        `Connect ${SOCIAL_PLATFORMS[platformType].name}`,
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listen for popup closure or success message
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup)
          // Refresh connections after popup closes
          const refreshConnections = async () => {
            const result: SocialConnectionListResult =
              await getSocialConnections(businessId, { status: "active" })

            if (result.success && result.data) {
              setConnections(result.data)
              onConnectionChange?.(result.data)
            }
          }
          refreshConnections()
        }
      }, 500)
    } catch (err) {
      setError("Gagal membuka halaman koneksi")
    }
  }

  // Handle disconnect
  const handleDisconnect = async (
    connection: BusinessSocialConnectionWithPlatform
  ) => {
    setIsDisconnecting(connection.id)
    setError(null)

    const result = await disconnectSocialPlatform(connection.id, businessId)

    if (result.success) {
      // Remove from local state
      const updatedConnections = connections.filter((c) => c.id !== connection.id)
      setConnections(updatedConnections)
      onConnectionChange?.(updatedConnections)
    } else {
      setError(result.error || "Gagal memutus koneksi")
    }

    setIsDisconnecting(null)
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-9 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(Object.keys(SOCIAL_PLATFORMS) as SocialPlatformType[]).map(
          (platformType) => {
            const platform = SOCIAL_PLATFORMS[platformType]
            const connection = getConnectionForPlatform(platformType)

            return (
              <Card
                key={platformType}
                className={cn(
                  "transition-all hover:shadow-md",
                  connection ? platform.borderColor : ""
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label="">
                        {platform.icon}
                      </span>
                      <div>
                        <CardTitle className="text-lg">
                          {platform.name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {platform.description}
                        </CardDescription>
                      </div>
                    </div>
                    {connection && (
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full bg-green-100",
                          platform.color
                        )}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {connection ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Terhubung sebagai:
                        </span>
                        <span className="font-medium">
                          {connection.platform_account_name ||
                            "Account Terhubung"}
                        </span>
                      </div>
                      {connection.last_used_at && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Terakhir digunakan:
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(
                              connection.last_used_at
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDisconnect(connection)}
                        disabled={isDisconnecting === connection.id}
                      >
                        {isDisconnecting === connection.id
                          ? "Memutus..."
                          : "Putuskan Koneksi"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleConnect(platformType)}
                    >
                      Hubungkan {platform.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          }
        )}
      </div>
    </div>
  )
}
