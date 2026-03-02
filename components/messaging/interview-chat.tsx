"use client"

import * as React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MessageThread } from "@/components/messaging/message-thread"
import { MessageInput } from "@/components/messaging/message-input"
import { VoiceCallButton } from "@/components/messaging/voice-call-button"
import { InterviewTimer } from "@/components/messaging/interview-timer"
import { InstantDispatchBadge } from "@/components/business/instant-dispatch-badge"
import { TierBadge } from "@/components/worker/tier-badge"
import {
  cn,
  formatRupiah,
} from "@/lib/utils"
import {
  MessageSquare,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  Zap,
} from "lucide-react"
import type {
  InterviewSession,
  InterviewStatus,
  InterviewType,
} from "@/lib/algorithms/interview-flow"
import {
  getInterviewConfig,
  isInterviewRequired,
  isVoiceCallRequired,
  isVoiceCallOptional,
  isInterviewComplete,
  getInterviewProgress,
  getInterviewStatusLabel,
  getInterviewTypeLabel,
  meetsChatDurationRequirement,
  meetsVoiceDurationRequirement,
} from "@/lib/algorithms/interview-flow"
import type { MessageWithRelations } from "@/lib/types/message"
import type { WorkerTier } from "@/lib/supabase/types"

export interface InterviewChatProps {
  interviewSession: InterviewSession
  workerName: string
  workerTier: WorkerTier
  workerAvatar?: string | null
  businessName: string
  currentUserId: string
  isBusiness: boolean
  messages: MessageWithRelations[]
  onSendMessage: (receiverId: string, content: string, bookingId?: string) => Promise<void>
  onStartVoiceCall?: () => void
  onEndVoiceCall?: () => void
  onToggleMute?: () => void
  onToggleSpeaker?: () => void
  onCompleteInterview?: () => void
  onCancelInterview?: () => void
  onAcceptInstantDispatch?: () => void
  voiceCallState?: "idle" | "calling" | "incoming" | "connected" | "ended"
  isMuted?: boolean
  isSpeakerOn?: boolean
  isLoading?: boolean
  className?: string
}

const InterviewChat = React.forwardRef<HTMLDivElement, InterviewChatProps>(
  (
    {
      interviewSession,
      workerName,
      workerTier,
      workerAvatar,
      businessName,
      currentUserId,
      isBusiness,
      messages,
      onSendMessage,
      onStartVoiceCall,
      onEndVoiceCall,
      onToggleMute,
      onToggleSpeaker,
      onCompleteInterview,
      onCancelInterview,
      onAcceptInstantDispatch,
      voiceCallState = "idle",
      isMuted = false,
      isSpeakerOn = false,
      isLoading = false,
      className,
    },
    ref
  ) => {
    const config = getInterviewConfig(workerTier)
    const progress = getInterviewProgress(interviewSession)

    const otherUserId = isBusiness ? interviewSession.workerId : interviewSession.businessId
    const receiverName = isBusiness ? workerName : businessName

    const chatCompleted = !!interviewSession.chatCompletedAt
    const voiceCompleted = !!interviewSession.voiceCompletedAt

    const canStartVoiceCall =
      chatCompleted &&
      (isVoiceCallRequired(workerTier) || isVoiceCallOptional(workerTier)) &&
      !voiceCompleted &&
      voiceCallState === "idle"

    const canCompleteInterview =
      isInterviewComplete(interviewSession) &&
      !config.voiceRequired &&
      !isInterviewRequired(workerTier)

    return (
      <div ref={ref} className={cn("flex flex-col h-full", className)}>
        {/* Header */}
        <CardHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                {/* Worker Avatar */}
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {workerAvatar ? (
                      <img src={workerAvatar} alt={workerName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold">{workerName.charAt(0)}</span>
                    )}
                  </div>
                  {interviewSession.status === "in_progress" && (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{workerName}</CardTitle>
                    <TierBadge tier={workerTier} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getInterviewStatusLabel(interviewSession.status)}
                    </Badge>
                    {!isInterviewRequired(workerTier) && (
                      <InstantDispatchBadge size="sm" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Interview Progress */}
            {isInterviewRequired(workerTier) && (
              <div className="text-right">
                <div className="text-sm font-medium">Progress: {progress}%</div>
                <Progress value={progress} className="w-24 h-1.5 mt-1" />
              </div>
            )}
          </div>

          {/* Interview Requirements */}
          {isInterviewRequired(workerTier) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {config.chatRequired && (
                <Badge
                  variant={chatCompleted ? "default" : "outline"}
                  className={cn(
                    "gap-1.5",
                    chatCompleted
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "border-blue-200 text-blue-700"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Chat Interview</span>
                  {chatCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                </Badge>
              )}
              {(config.voiceRequired || isVoiceCallOptional(workerTier)) && (
                <Badge
                  variant={voiceCompleted ? "default" : "outline"}
                  className={cn(
                    "gap-1.5",
                    voiceCompleted
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : isVoiceCallRequired(workerTier)
                        ? "border-purple-200 text-purple-700"
                        : "border-orange-200 text-orange-700"
                  )}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>
                    {isVoiceCallRequired(workerTier)
                      ? "Voice Call"
                      : "Voice (Opsional)"}
                  </span>
                  {voiceCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                </Badge>
              )}
            </div>
          )}

          {/* Instant Dispatch Info */}
          {!isInterviewRequired(workerTier) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <Zap className="h-4 w-4 fill-current" />
              <span>
                Instant dispatch - No interview needed. Time to hire: &lt;5 minutes
              </span>
            </div>
          )}
        </CardHeader>

        {/* Timer */}
        {isInterviewRequired(workerTier) && interviewSession.status === "in_progress" && (
          <div className="px-6 py-3 border-b">
            <InterviewTimer
              status={interviewSession.status}
              startedAt={interviewSession.startedAt}
              completedAt={interviewSession.completedAt}
              duration={interviewSession.totalDuration}
              requiredDuration={config.chatRequired ? config.minChatDuration : undefined}
              maxDuration={config.maxChatDuration}
              label="Interview Duration"
              variant="compact"
            />
          </div>
        )}

        {/* Messages */}
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          <MessageThread
            messages={messages}
            currentUserId={currentUserId}
            isLoading={isLoading}
            groupConsecutive={true}
            showAvatar={true}
            showSenderName={false}
            className="flex-1"
          />

          {/* Input Area */}
          {interviewSession.status !== "completed" &&
           interviewSession.status !== "skipped" && (
            <div className="border-t p-4 space-y-3">
              {/* Voice Call Controls */}
              {canStartVoiceCall && onStartVoiceCall && (
                <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-700" />
                    <span className="text-sm font-medium text-purple-700">
                      {isVoiceCallRequired(workerTier)
                        ? "Voice call wajib"
                        : "Panggilan suara opsional"}
                    </span>
                  </div>
                  <VoiceCallButton
                    onClick={onStartVoiceCall}
                    variant="compact"
                  />
                </div>
              )}

              {/* Connected Call Controls */}
              {voiceCallState === "connected" && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-green-700">
                      Panggilan Berlangsung
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <VoiceCallButton
                      callState="connected"
                      isMuted={isMuted}
                      isSpeakerOn={isSpeakerOn}
                      onToggleMute={onToggleMute}
                      onToggleSpeaker={onToggleSpeaker}
                      onEndCall={onEndVoiceCall}
                      variant="icon-only"
                    />
                  </div>
                </div>
              )}

              {/* Chat Input */}
              {(!config.voiceRequired || !voiceCompleted) && (
                <MessageInput
                  receiverId={otherUserId}
                  bookingId={interviewSession.bookingId}
                  onSendMessage={onSendMessage}
                  placeholder={`Tulis pesan ke ${receiverName}...`}
                  disabled={voiceCallState === "connected"}
                  maxLength={2000}
                />
              )}

              {/* Minimum Duration Warning */}
              {config.chatRequired && !chatCompleted && interviewSession.chatStartedAt && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Minimal durasi chat: {config.minChatDuration / 60} menit
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Completion Actions */}
          {interviewSession.status === "in_progress" && isInterviewComplete(interviewSession) && (
            <div className="border-t p-4 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">
                  Interview Selesai
                </span>
              </div>
              <div className="flex gap-2">
                {onCompleteInterview && (
                  <Button
                    onClick={onCompleteInterview}
                    className="flex-1"
                  >
                    Lanjut ke Booking
                  </Button>
                )}
                {onCancelInterview && (
                  <Button
                    variant="outline"
                    onClick={onCancelInterview}
                  >
                    Batal
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Instant Dispatch Action */}
          {!isInterviewRequired(workerTier) && onAcceptInstantDispatch && (
            <div className="border-t p-4 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-green-600 fill-current" />
                <span className="font-medium text-green-700">
                  Siap untuk Instant Dispatch
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onAcceptInstantDispatch}
                  className="flex-1"
                >
                  Booking Sekarang
                </Button>
              </div>
            </div>
          )}

          {/* Cancel Action */}
          {interviewSession.status === "in_progress" && !isInterviewComplete(interviewSession) && onCancelInterview && (
            <div className="border-t p-4">
              <Button
                variant="ghost"
                onClick={onCancelInterview}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                Batalkan Interview
              </Button>
            </div>
          )}
        </CardContent>
      </div>
    )
  }
)
InterviewChat.displayName = "InterviewChat"

export { InterviewChat }
