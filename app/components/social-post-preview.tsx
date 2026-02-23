"use client"

import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatForInstagram, formatForFacebook, type SocialContentInput } from "@/lib/utils/social-content"

export type SocialPlatform = "instagram" | "facebook"

export interface SocialPostPreviewProps {
  platform: SocialPlatform
  content: SocialContentInput
  className?: string
}

const platformConfig = {
  instagram: {
    name: "Instagram",
    icon: "📸",
    color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    textColor: "text-white",
    characterLimit: 2200,
  },
  facebook: {
    name: "Facebook",
    icon: "👥",
    color: "bg-blue-600",
    textColor: "text-white",
    characterLimit: 63206,
  },
}

const characterCountColor = (count: number, limit: number): string => {
  const percentage = (count / limit) * 100
  if (percentage >= 100) return "text-destructive"
  if (percentage >= 90) return "text-orange-500"
  if (percentage >= 75) return "text-yellow-500"
  return "text-muted-foreground"
}

export function SocialPostPreview({ platform, content, className }: SocialPostPreviewProps) {
  const config = platformConfig[platform]

  const formattedContent = React.useMemo(() => {
    if (platform === "instagram") {
      return formatForInstagram(content)
    }
    return formatForFacebook(content)
  }, [platform, content])

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Platform Header */}
      <div className={cn("px-6 py-4", config.color, config.textColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <span className="font-semibold text-lg">{config.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-90">
              {formattedContent.characterCount.toLocaleString()} / {config.characterLimit.toLocaleString()}
            </span>
            {formattedContent.withinLimit ? (
              <span className="text-xs px-2 py-1 rounded-full bg-white/20">✓ OK</span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-red-500">⚠ Too Long</span>
            )}
          </div>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-base">Post Preview</CardTitle>
        <CardDescription>
          Preview of how your job post will appear on {config.name}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Preview Container - mimics platform appearance */}
        <div
          className={cn(
            "rounded-lg p-4 border",
            platform === "instagram" && "bg-gradient-to-br from-purple-50 to-pink-50 border-pink-100",
            platform === "facebook" && "bg-gray-50 border-gray-200"
          )}
        >
          {/* Platform-specific content styling */}
          <div className="space-y-3">
            {/* Content text */}
            <div
              className={cn(
                "whitespace-pre-wrap break-words text-sm leading-relaxed",
                platform === "instagram" && "font-medium",
                platform === "facebook" && "text-gray-800"
              )}
            >
              {formattedContent.text}
            </div>

            {/* Character count indicator */}
            <div className={cn("text-xs pt-2 border-t", characterCountColor(formattedContent.characterCount, config.characterLimit))}>
              <div className="flex justify-between items-center">
                <span>Characters: {formattedContent.characterCount.toLocaleString()}</span>
                <span>
                  {Math.round((formattedContent.characterCount / config.characterLimit) * 100)}% of limit
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-1 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    formattedContent.withinLimit
                      ? "bg-green-500"
                      : "bg-destructive"
                  )}
                  style={{
                    width: `${Math.min(
                      (formattedContent.characterCount / config.characterLimit) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Hashtags */}
            {formattedContent.hashtags && formattedContent.hashtags.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Hashtags:</p>
                <div className="flex flex-wrap gap-1">
                  {formattedContent.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        platform === "instagram" && "bg-pink-100 text-pink-700",
                        platform === "facebook" && "bg-blue-100 text-blue-700"
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Call to Action */}
            {formattedContent.callToAction && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Call to Action:</p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    platform === "instagram" && "text-pink-700",
                    platform === "facebook" && "text-blue-700"
                  )}
                >
                  {formattedContent.callToAction}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Warning if content exceeds limit */}
        {!formattedContent.withinLimit && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Content exceeds {config.name}&apos;s character limit ({config.characterLimit.toLocaleString()} characters)
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              Please shorten your job description or remove some details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export interface SocialPostPreviewGalleryProps {
  content: SocialContentInput
  platforms?: SocialPlatform[]
  className?: string
}

export function SocialPostPreviewGallery({
  content,
  platforms = ["instagram", "facebook"],
  className,
}: SocialPostPreviewGalleryProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Social Media Preview</h3>
        <p className="text-sm text-muted-foreground">
          See how your job will appear on each platform
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {platforms.map((platform) => (
          <SocialPostPreview key={platform} platform={platform} content={content} />
        ))}
      </div>
    </div>
  )
}
