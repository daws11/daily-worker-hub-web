"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Phone,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Volume2,
  VolumeX,
} from "lucide-react"

export interface VoiceCallButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant'> {
  callState?: "idle" | "calling" | "incoming" | "connected" | "ended"
  isMuted?: boolean
  isSpeakerOn?: boolean
  onToggleMute?: () => void
  onToggleSpeaker?: () => void
  onEndCall?: () => void
  variant?: "default" | "icon-only" | "compact"
}

const VoiceCallButton = React.forwardRef<HTMLButtonElement, VoiceCallButtonProps>(
  (
    {
      callState = "idle",
      isMuted = false,
      isSpeakerOn = false,
      onToggleMute,
      onToggleSpeaker,
      onEndCall,
      variant = "default",
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Get appropriate icon based on call state
    const getCallIcon = () => {
      switch (callState) {
        case "calling":
          return <PhoneOutgoing className="h-4 w-4 animate-pulse" />
        case "incoming":
          return <PhoneIncoming className="h-4 w-4 animate-bounce" />
        case "connected":
          return <Phone className="h-4 w-4" />
        default:
          return <Phone className="h-4 w-4" />
      }
    }

    // Get button text based on call state
    const getCallText = () => {
      switch (callState) {
        case "calling":
          return "Memanggil..."
        case "incoming":
          return "Panggilan Masuk"
        case "connected":
          return "Terhubung"
        case "ended":
          return "Panggilan Berakhir"
        default:
          return children || "Panggilan Suara"
      }
    }

    // Get button variant based on call state
    const getButtonVariant = (): "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" => {
      if (callState === "connected") {
        return "destructive"
      }
      if (callState === "calling") {
        return "secondary"
      }
      if (callState === "incoming") {
        return "default"
      }
      return "default"
    }

    // Handle button click
    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (callState === "connected") {
        onEndCall?.()
      } else if (props.onClick) {
        props.onClick(e as React.MouseEvent<HTMLButtonElement>)
      }
    }

    // Render icon-only variant
    if (variant === "icon-only") {
      return (
        <Button
          ref={ref}
          size="icon"
          variant={getButtonVariant()}
          className={cn(
            "rounded-full",
            callState === "connected" && "bg-red-500 hover:bg-red-600",
            callState === "incoming" && "animate-pulse",
            className
          )}
          disabled={disabled || callState === "calling"}
          onClick={handleClick}
          {...props}
        >
          {getCallIcon()}
        </Button>
      )
    }

    // Render compact variant
    if (variant === "compact") {
      return (
        <Button
          ref={ref}
          size="sm"
          variant={getButtonVariant()}
          className={cn(
            "gap-2",
            callState === "connected" && "bg-red-500 hover:bg-red-600",
            callState === "incoming" && "animate-pulse",
            className
          )}
          disabled={disabled || callState === "calling"}
          onClick={handleClick}
          {...props}
        >
          {getCallIcon()}
          <span>{getCallText()}</span>
        </Button>
      )
    }

    // Default variant with additional controls
    if (callState === "connected") {
      return (
        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          {onToggleMute && (
            <Button
              size="icon"
              variant="outline"
              className={cn(
                "rounded-full",
                isMuted && "bg-muted"
              )}
              onClick={onToggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Speaker toggle */}
          {onToggleSpeaker && (
            <Button
              size="icon"
              variant="outline"
              className={cn(
                "rounded-full",
                isSpeakerOn && "bg-muted"
              )}
              onClick={onToggleSpeaker}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          )}

          {/* End call button */}
          <Button
            ref={ref}
            size="icon"
            variant="destructive"
            className="rounded-full"
            onClick={onEndCall}
            {...props}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      )
    }

    // Idle or calling state
    return (
      <Button
        ref={ref}
        variant={getButtonVariant()}
        className={cn(
          "gap-2",
          callState === "incoming" && "animate-pulse",
          className
        )}
        disabled={disabled || callState === "calling"}
        onClick={handleClick}
        {...props}
      >
        {getCallIcon()}
        <span>{getCallText()}</span>
      </Button>
    )
  }
)
VoiceCallButton.displayName = "VoiceCallButton"

export { VoiceCallButton }
