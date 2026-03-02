/**
 * Interview Page Example
 *
 * This is an example implementation of the interview interface.
 * In production, this would be integrated with your actual auth and data fetching.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InterviewChat } from '@/components/messaging/interview-chat'
import { getInterviewSessionByBooking } from '@/lib/actions/bookings'
import { getBookingMessages } from '@/lib/actions/messages'
import { sendMessage } from '@/lib/actions/messages'
import {
  completeInterviewSession,
  cancelInterviewSession,
  startVoiceCallInterview,
  completeVoiceCallInterview,
} from '@/lib/actions/bookings'

interface InterviewPageProps {
  params: {
    id: string
  }
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Get interview session
  const { data: interviewSession, error: sessionError } = await getInterviewSessionByBooking(params.id)

  if (sessionError || !interviewSession) {
    notFound()
  }

  // Verify user has access to this interview
  if (interviewSession.businessId !== user.id && interviewSession.workerId !== user.id) {
    notFound()
  }

  // Get messages
  const { data: messages } = await getBookingMessages(params.id, 100)

  // Get business and worker info
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, avatar_url, user_id')
    .eq('id', interviewSession.businessId)
    .single()

  const { data: worker } = await supabase
    .from('workers')
    .select('id, full_name, avatar_url, user_id')
    .eq('id', interviewSession.workerId)
    .single()

  if (!business || !worker) {
    notFound()
  }

  const isBusiness = user.id === business.user_id

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Interview Session</h1>
          <p className="text-muted-foreground">
            {isBusiness ? `Interviewing ${worker.full_name}` : `Interview with ${business.name}`}
          </p>
        </div>

        <InterviewChat
          interviewSession={{
            id: interviewSession.id,
            bookingId: interviewSession.booking_id,
            businessId: interviewSession.business_id,
            workerId: interviewSession.worker_id,
            workerTier: interviewSession.worker_tier,
            status: interviewSession.status as any,
            type: interviewSession.type as any,
            startedAt: interviewSession.started_at,
            completedAt: interviewSession.completed_at,
            chatStartedAt: interviewSession.chat_started_at,
            chatCompletedAt: interviewSession.chat_completed_at,
            voiceStartedAt: interviewSession.voice_started_at,
            voiceCompletedAt: interviewSession.voice_completed_at,
            chatDuration: interviewSession.chat_duration,
            voiceDuration: interviewSession.voice_duration,
            totalDuration: interviewSession.total_duration,
            messagesSent: interviewSession.messages_sent,
            voiceCallInitiated: interviewSession.voice_call_initiated,
            timeToHire: interviewSession.time_to_hire ? parseFloat(interviewSession.time_to_hire.toString()) : null,
            createdAt: interviewSession.created_at,
          }}
          workerName={worker.full_name}
          workerTier={interviewSession.worker_tier}
          workerAvatar={worker.avatar_url}
          businessName={business.name}
          currentUserId={user.id}
          isBusiness={isBusiness}
          messages={messages || []}
          onSendMessage={async (receiverId, content, bookingId) => {
            'use server'
            await sendMessage(user.id, receiverId, content, bookingId)
          }}
          onStartVoiceCall={async () => {
            'use server'
            await startVoiceCallInterview(interviewSession.id, user.id)
          }}
          onEndVoiceCall={async () => {
            'use server'
            await completeVoiceCallInterview(interviewSession.id, user.id)
          }}
          onCompleteInterview={async () => {
            'use server'
            await completeInterviewSession(interviewSession.id, user.id)
          }}
          onCancelInterview={async () => {
            'use server'
            await cancelInterviewSession(interviewSession.id, user.id)
          }}
        />
      </div>
    </div>
  )
}
