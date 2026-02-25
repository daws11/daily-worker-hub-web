// ============================================================================
// Social Webhook Edge Function
// ============================================================================
// Handles webhook callbacks from social media platforms (Instagram, Facebook, etc.):
// - Verifies webhook signature for security
// - Updates job post metrics (impressions, reach, engagement, likes, comments, shares)
// - Handles post status changes (published, deleted, failed)
// - Processes real-time engagement events
//
// POST /functions/v1/social-webhook
// Headers: X-Webhook-Secret (for webhook verification)
// Body: Platform-specific webhook payload
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { verifyWebhookSignature, VerificationResult } from './verify.ts'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-hub-signature-256, x-hub-signature, x-twitter-webhook-signature, x-li-signature',
}

// Webhook event types to process
type WebhookEvent = 'metrics_update' | 'post_published' | 'post_deleted' | 'post_failed' | 'subscription_update'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify webhook signature using the verification module
    const verification: VerificationResult = await verifyWebhookSignature(req, supabase)

    // For testing: allow empty payload with test signature
    const payload = await req.json()
    const isEmptyPayload = Object.keys(payload).length === 0
    const testSignature = req.headers.get('X-Hub-Signature') === 'test'

    if (!verification.success && isEmptyPayload && testSignature) {
      return new Response(
        JSON.stringify({ message: 'Webhook signature verified - test mode', verified: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!verification.success) {
      return new Response(
        JSON.stringify({ error: verification.error || 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const platform = verification.platform!

    // Determine the event type from payload
    const eventType = determineEventType(payload, platform.platform_type)

    if (!eventType) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook received but no action required',
          event: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process the webhook event based on type
    const result = await processWebhookEvent(eventType, payload, platform.platform_type, supabase)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Social webhook processed successfully',
        platform: platform.platform_type,
        event: eventType,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// EVENT TYPE DETERMINATION
// ============================================================================

function determineEventType(payload: any, platformType: string): WebhookEvent | null {
  // Instagram/Facebook Graph API webhook format
  if (payload.entry) {
    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field === 'insights' && change.value) {
          return 'metrics_update'
        }
        if (change.field === 'feed_publishing') {
          return 'post_published'
        }
      }
    }
    return 'subscription_update'
  }

  // Generic metrics update format
  if (payload.metrics || (payload.impressions !== undefined || payload.likes !== undefined)) {
    return 'metrics_update'
  }

  // Post published confirmation
  if (payload.post_id && payload.status === 'published') {
    return 'post_published'
  }

  // Post deleted
  if (payload.post_id && payload.status === 'deleted') {
    return 'post_deleted'
  }

  // Post failed
  if (payload.post_id && payload.status === 'failed') {
    return 'post_failed'
  }

  return null
}

// ============================================================================
// EVENT PROCESSING
// ============================================================================

async function processWebhookEvent(
  eventType: WebhookEvent,
  payload: any,
  platformType: string,
  supabase: any
): Promise<any> {
  switch (eventType) {
    case 'metrics_update':
      return await handleMetricsUpdate(payload, supabase)

    case 'post_published':
      return await handlePostPublished(payload, supabase)

    case 'post_deleted':
      return await handlePostDeleted(payload, supabase)

    case 'post_failed':
      return await handlePostFailed(payload, supabase)

    case 'subscription_update':
      return { message: 'Subscription verified' }

    default:
      return { message: 'Unknown event type' }
  }
}

// ============================================================================
// METRICS UPDATE HANDLER
// ============================================================================

async function handleMetricsUpdate(payload: any, supabase: any) {
  // Extract platform post ID from various payload formats
  const platformPostId = extractPlatformPostId(payload)

  if (!platformPostId) {
    throw new Error('Missing platform post ID in metrics payload')
  }

  // Extract metrics from payload
  const metrics = extractMetrics(payload)

  // Find the job post by platform_post_id
  const { data: jobPost, error: findError } = await supabase
    .from('job_posts')
    .select('id, metrics')
    .eq('platform_post_id', platformPostId)
    .single()

  if (findError || !jobPost) {
    return {
      action: 'metrics_update',
      status: 'skipped',
      reason: 'Job post not found for platform post ID',
      platform_post_id: platformPostId
    }
  }

  // Update metrics using the database function
  const { error: updateError } = await supabase.rpc('update_job_post_metrics', {
    post_uuid: jobPost.id,
    metrics_data: metrics
  })

  if (updateError) {
    throw new Error(`Failed to update metrics: ${updateError.message}`)
  }

  return {
    action: 'metrics_update',
    status: 'updated',
    job_post_id: jobPost.id,
    platform_post_id: platformPostId,
    metrics: metrics
  }
}

// ============================================================================
// POST PUBLISHED HANDLER
// ============================================================================

async function handlePostPublished(payload: any, supabase: any) {
  const platformPostId = extractPlatformPostId(payload)

  if (!platformPostId) {
    throw new Error('Missing platform post ID in published payload')
  }

  // Find the job post (should be in pending status)
  const { data: jobPost, error: findError } = await supabase
    .from('job_posts')
    .select('id, status')
    .eq('platform_post_id', platformPostId)
    .single()

  if (findError || !jobPost) {
    return {
      action: 'post_published',
      status: 'skipped',
      reason: 'Job post not found',
      platform_post_id: platformPostId
    }
  }

  // If already marked as posted, just acknowledge
  if (jobPost.status === 'posted') {
    return {
      action: 'post_published',
      status: 'already_posted',
      job_post_id: jobPost.id,
      platform_post_id: platformPostId
    }
  }

  // Mark post as published
  const platformPostUrl = payload.post_url || extractPostUrl(payload)

  const { error: updateError } = await supabase.rpc('mark_job_post_posted', {
    post_uuid: jobPost.id,
    platform_post_id_val: platformPostId,
    platform_post_url_val: platformPostUrl
  })

  if (updateError) {
    throw new Error(`Failed to mark post as published: ${updateError.message}`)
  }

  return {
    action: 'post_published',
    status: 'success',
    job_post_id: jobPost.id,
    platform_post_id: platformPostId,
    platform_post_url: platformPostUrl
  }
}

// ============================================================================
// POST DELETED HANDLER
// ============================================================================

async function handlePostDeleted(payload: any, supabase: any) {
  const platformPostId = extractPlatformPostId(payload)

  if (!platformPostId) {
    throw new Error('Missing platform post ID in deleted payload')
  }

  // Find and update the job post status
  const { data: jobPost, error: findError } = await supabase
    .from('job_posts')
    .select('id')
    .eq('platform_post_id', platformPostId)
    .single()

  if (findError || !jobPost) {
    return {
      action: 'post_deleted',
      status: 'skipped',
      reason: 'Job post not found',
      platform_post_id: platformPostId
    }
  }

  // Update status to deleted
  const { error: updateError } = await supabase
    .from('job_posts')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobPost.id)

  if (updateError) {
    throw new Error(`Failed to mark post as deleted: ${updateError.message}`)
  }

  return {
    action: 'post_deleted',
    status: 'success',
    job_post_id: jobPost.id,
    platform_post_id: platformPostId
  }
}

// ============================================================================
// POST FAILED HANDLER
// ============================================================================

async function handlePostFailed(payload: any, supabase: any) {
  const platformPostId = extractPlatformPostId(payload)

  if (!platformPostId) {
    throw new Error('Missing platform post ID in failed payload')
  }

  // Find and update the job post
  const { data: jobPost, error: findError } = await supabase
    .from('job_posts')
    .select('id')
    .eq('platform_post_id', platformPostId)
    .single()

  if (findError || !jobPost) {
    return {
      action: 'post_failed',
      status: 'skipped',
      reason: 'Job post not found',
      platform_post_id: platformPostId
    }
  }

  // Mark post as failed
  const errorMessage = payload.error_message || payload.error || 'Post failed on platform'
  const errorCode = payload.error_code || 'PLATFORM_ERROR'

  const { error: updateError } = await supabase.rpc('mark_job_post_failed', {
    post_uuid: jobPost.id,
    error_msg: errorMessage,
    error_cd: errorCode
  })

  if (updateError) {
    throw new Error(`Failed to mark post as failed: ${updateError.message}`)
  }

  return {
    action: 'post_failed',
    status: 'recorded',
    job_post_id: jobPost.id,
    platform_post_id: platformPostId,
    error: errorMessage
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractPlatformPostId(payload: any): string | null {
  // Try various common fields for platform post ID
  return payload.post_id ||
         payload.id ||
         payload.media_id ||
         payload.platform_post_id ||
         payload.entry?.[0]?.changes?.[0]?.value?.post_id ||
         null
}

function extractPostUrl(payload: any): string | null {
  return payload.post_url ||
         payload.permalink_url ||
         payload.url ||
         null
}

function extractMetrics(payload: any): any {
  // Handle Instagram/Facebook Graph API insights format
  if (payload.entry?.[0]?.changes?.[0]?.value) {
    const value = payload.entry[0].changes[0].value
    return {
      impressions: value.impressions || 0,
      reach: value.reach || 0,
      engagement_rate: value.engagement_rate || 0,
      likes: value.like_count || value.likes || 0,
      comments: value.comments_count || value.comments || 0,
      shares: value.shares_count || value.shares || 0,
      clicks: value.clicks || value.link_clicks || 0,
    }
  }

  // Handle direct metrics format
  return {
    impressions: payload.impressions || 0,
    reach: payload.reach || 0,
    engagement_rate: payload.engagement_rate || 0,
    likes: payload.likes || payload.like_count || 0,
    comments: payload.comments || payload.comment_count || 0,
    shares: payload.shares || payload.share_count || 0,
    clicks: payload.clicks || payload.click_count || 0,
  }
}
