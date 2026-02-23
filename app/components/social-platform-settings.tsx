"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  getSocialConnections,
  updatePlatformSettings,
  getPlatformSettings,
  type SocialConnectionListResult,
} from "@/lib/actions/social"
import type {
  BusinessSocialConnectionWithPlatform,
  ConnectionSettings,
  SocialPlatformType,
} from "@/lib/types/social"
import { SOCIAL_PLATFORMS } from "./social-platform-connect"

export interface SocialPlatformSettingsProps {
  businessId: string
  className?: string
}

export function SocialPlatformSettings({
  businessId,
  className,
}: SocialPlatformSettingsProps) {
  const [connections, setConnections] = React.useState<
    BusinessSocialConnectionWithPlatform[]
  >([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  // Settings state for each connection
  const [settingsMap, setSettingsMap] = React.useState<
    Record<string, ConnectionSettings>
  >({})

  // Fetch connections and settings on mount
  React.useEffect(() => {
    const fetchConnections = async () => {
      setIsLoading(true)
      setError(null)

      const result: SocialConnectionListResult = await getSocialConnections(businessId, {
        status: "active",
      })

      if (result.success && result.data) {
        setConnections(result.data)

        // Fetch settings for each connection
        const settingsPromises = result.data.map(async (connection) => {
          const settingsResult = await getPlatformSettings(connection.id, businessId)
          return {
            connectionId: connection.id,
            settings: (settingsResult.data as ConnectionSettings) || {},
          }
        })

        const settingsResults = await Promise.all(settingsPromises)
        const settingsMap: Record<string, ConnectionSettings> = {}
        for (const result of settingsResults) {
          settingsMap[result.connectionId] = result.settings
        }
        setSettingsMap(settingsMap)
      } else if (result.error) {
        setError(result.error)
      }

      setIsLoading(false)
    }

    fetchConnections()
  }, [businessId])

  // Update a specific setting for a connection
  const updateSetting = (
    connectionId: string,
    key: keyof ConnectionSettings,
    value: unknown
  ) => {
    setSettingsMap((prev) => ({
      ...prev,
      [connectionId]: {
        ...prev[connectionId],
        [key]: value as never,
      },
    }))
  }

  // Save settings for a connection
  const saveSettings = async (connectionId: string) => {
    setIsSaving(connectionId)
    setError(null)
    setSuccessMessage(null)

    const settings = settingsMap[connectionId]
    const result = await updatePlatformSettings(connectionId, businessId, settings)

    if (result.success) {
      setSuccessMessage("Pengaturan berhasil disimpan")
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || "Gagal menyimpan pengaturan")
    }

    setIsSaving(null)
  }

  // Get connection for a specific platform
  const getConnectionForPlatform = (
    platformType: SocialPlatformType
  ): BusinessSocialConnectionWithPlatform | undefined => {
    return connections.find(
      (c) => c.platform?.platform_type === platformType && c.status === "active"
    )
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
                <div className="space-y-4">
                  <div className="h-9 w-full bg-muted rounded" />
                  <div className="h-9 w-full bg-muted rounded" />
                </div>
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

      {successMessage && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(Object.keys(SOCIAL_PLATFORMS) as SocialPlatformType[]).map(
          (platformType) => {
            const platform = SOCIAL_PLATFORMS[platformType]
            const connection = getConnectionForPlatform(platformType)
            const settings = connection ? settingsMap[connection.id] : undefined

            // Only show settings for connected platforms
            if (!connection) {
              return null
            }

            return (
              <Card
                key={platformType}
                className={cn(
                  "transition-all hover:shadow-md",
                  platform.borderColor
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
                          {connection.platform_account_name ||
                            "Account Terhubung"}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Auto Post Enabled Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`auto-post-${connection.id}`}>
                          Auto Post
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Otomatis posting lowongan ke {platform.name}
                        </p>
                      </div>
                      <Switch
                        id={`auto-post-${connection.id}`}
                        checked={settings?.autoPostEnabled ?? false}
                        onCheckedChange={(checked) =>
                          updateSetting(connection.id, "autoPostEnabled", checked)
                        }
                      />
                    </div>

                    {/* Post Timing */}
                    {settings?.autoPostEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor={`timing-${connection.id}`}>
                          Waktu Posting
                        </Label>
                        <Select
                          value={settings?.defaultPostTiming || "immediate"}
                          onValueChange={(value: "immediate" | "scheduled") =>
                            updateSetting(
                              connection.id,
                              "defaultPostTiming",
                              value
                            )
                          }
                        >
                          <SelectTrigger id={`timing-${connection.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">
                              Segera (setelah publish)
                            </SelectItem>
                            <SelectItem value="scheduled">
                              Terjadwal
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Scheduled Time */}
                    {settings?.autoPostEnabled &&
                      settings?.defaultPostTiming === "scheduled" && (
                        <div className="space-y-2">
                          <Label htmlFor={`schedule-${connection.id}`}>
                                Jadwal Posting
                          </Label>
                          <input
                            id={`schedule-${connection.id}`}
                            type="time"
                            className={cn(
                              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                              "disabled:cursor-not-allowed disabled:opacity-50"
                            )}
                            value={settings?.scheduledTime || ""}
                            onChange={(e) =>
                              updateSetting(
                                connection.id,
                                "scheduledTime",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )}

                    {/* Custom Formatting Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`custom-${connection.id}`}>
                          Format Kustom
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Gunakan format caption kustom
                        </p>
                      </div>
                      <Switch
                        id={`custom-${connection.id}`}
                        checked={settings?.customFormatting ?? false}
                        onCheckedChange={(checked) =>
                          updateSetting(connection.id, "customFormatting", checked)
                        }
                      />
                    </div>

                    {/* Save Button */}
                    <Button
                      onClick={() => saveSettings(connection.id)}
                      disabled={isSaving === connection.id}
                      className="w-full"
                      size="sm"
                    >
                      {isSaving === connection.id
                        ? "Menyimpan..."
                        : "Simpan Pengaturan"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          }
        )}
      </div>

      {connections.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Tidak ada platform social media yang terhubung. Hubungkan
              platform terlebih dahulu untuk mengatur pengaturan posting.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
