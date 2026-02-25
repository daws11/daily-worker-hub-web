"use client"

import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  getSocialConnections,
  type SocialConnectionListResult,
} from "@/lib/actions/social"
import type {
  BusinessSocialConnectionWithPlatform,
  SocialPlatformType,
} from "@/lib/types/social"
import { SOCIAL_PLATFORMS } from "./social-platform-connect"

export interface PlatformSelection {
  platformType: SocialPlatformType
  connectionId: string
  enabled: boolean
}

export interface SocialPlatformSelectorProps {
  businessId: string
  selectedPlatforms: SocialPlatformType[]
  onSelectionChange: (platforms: PlatformSelection[]) => void
  disabled?: boolean
  className?: string
}

export function SocialPlatformSelector({
  businessId,
  selectedPlatforms,
  onSelectionChange,
  disabled = false,
  className,
}: SocialPlatformSelectorProps) {
  const [connections, setConnections] = React.useState<
    BusinessSocialConnectionWithPlatform[]
  >([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [enabledPlatforms, setEnabledPlatforms] = React.useState<Set<SocialPlatformType>>(
    new Set(selectedPlatforms)
  )

  // Fetch connections on mount
  React.useEffect(() => {
    const fetchConnections = async () => {
      setIsLoading(true)
      setError(null)

      const result: SocialConnectionListResult = await getSocialConnections(businessId, {
        status: "active",
      })

      if (result.success && result.data) {
        setConnections(result.data)
      } else if (result.error) {
        setError(result.error)
      }

      setIsLoading(false)
    }

    fetchConnections()
  }, [businessId])

  // Update enabled platforms when selectedPlatforms prop changes
  React.useEffect(() => {
    setEnabledPlatforms(new Set(selectedPlatforms))
  }, [selectedPlatforms])

  // Handle platform toggle
  const handleToggle = (platformType: SocialPlatformType, connectionId: string, enabled: boolean) => {
    const newEnabled = new Set(enabledPlatforms)

    if (enabled) {
      newEnabled.add(platformType)
    } else {
      newEnabled.delete(platformType)
    }

    setEnabledPlatforms(newEnabled)

    // Build the selection array
    const selections: PlatformSelection[] = Array.from(newEnabled).map((pt) => {
      const conn = connections.find((c) => c.platform?.platform_type === pt)
      return {
        platformType: pt,
        connectionId: conn?.id || "",
        enabled: true,
      }
    })

    onSelectionChange(selections)
  }

  // Get connection for a specific platform
  const getConnectionForPlatform = (
    platformType: SocialPlatformType
  ): BusinessSocialConnectionWithPlatform | undefined => {
    return connections.find(
      (c) => c.platform?.platform_type === platformType && c.status === "active"
    )
  }

  // Check if platform is enabled
  const isPlatformEnabled = (platformType: SocialPlatformType): boolean => {
    return enabledPlatforms.has(platformType)
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
                <div className="h-9 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Tidak ada platform social media yang terhubung. Hubungkan platform terlebih
            dahulu untuk membagikan lowongan pekerjaan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bagikan ke Social Media</CardTitle>
          <CardDescription>
            Pilih platform social media untuk membagikan lowongan ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(Object.keys(SOCIAL_PLATFORMS) as SocialPlatformType[]).map(
              (platformType) => {
                const platform = SOCIAL_PLATFORMS[platformType]
                const connection = getConnectionForPlatform(platformType)
                const isEnabled = isPlatformEnabled(platformType)

                // Only show platforms that have active connections
                if (!connection) {
                  return null
                }

                return (
                  <div
                    key={platformType}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-colors",
                      isEnabled ? platform.borderColor : "border-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label="">
                        {platform.icon}
                      </span>
                      <div>
                        <p className="font-medium">{platform.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {connection.platform_account_name || "Account Terhubung"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle(platformType, connection.id, checked)
                      }
                      disabled={disabled}
                    />
                  </div>
                )
              }
            )}

            {connections.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Tidak ada platform yang terhubung. Hubungkan platform di halaman
                pengaturan untuk membagikan lowongan.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
