// ============================================================================
// Webhook Signature Verification
// ============================================================================
// Verifies webhook signatures from social media platforms:
// - Supports X-Hub-Signature-256 (Instagram/Facebook HMAC SHA256)
// - Supports X-Webhook-Secret (simple secret validation)
// - Validates against registered platform webhook secrets in database
//
// This ensures webhooks are actually from the claimed platform and prevents
// spoofed webhook requests that could corrupt job post data.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Verification result types
export interface VerificationResult {
  success: boolean
  platform?: {
    id: string
    platform_type: string
    webhook_secret: string
  }
  error?: string
}

// Platform-specific signature header preferences
const SIGNATURE_HEADERS: Record<string, string[]> = {
  'instagram': ['X-Hub-Signature-256', 'X-Hub-Signature', 'X-Webhook-Secret'],
  'facebook': ['X-Hub-Signature-256', 'X-Hub-Signature', 'X-Webhook-Secret'],
  'twitter': ['X-Twitter-Webhook-Signature', 'X-Webhook-Secret'],
  'linkedin': ['X-Li-Signature', 'X-Webhook-Secret'],
  'tiktok': ['X-TikTok-Signature', 'X-Webhook-Secret'],
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify HMAC SHA256 signature (used by Instagram/Facebook)
 * Format: sha256=<hex_signature>
 */
export function verifyHMACSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Remove sha256= prefix if present
  const signatureBytes = signature.replace('sha256=', '')

  // Convert secret and payload to bytes
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)

  // Import the key for HMAC
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(async (key) => {
    // Sign the payload
    const signatureData = encoder.encode(payload)
    const computedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      signatureData
    )

    // Convert to hex string
    const computedHex = Array.from(new Uint8Array(computedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Constant-time comparison to prevent timing attacks
    return constantTimeCompare(computedHex, signatureBytes)
  })
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify webhook signature and return platform information
 */
export async function verifyWebhookSignature(
  req: Request,
  supabase: any
): Promise<VerificationResult> {
  // Get all possible signature headers
  const headers = req.headers

  // Try to get signature from various header names
  const webhookSecret = headers.get('X-Webhook-Secret')
  const hubSignature = headers.get('X-Hub-Signature-256') || headers.get('X-Hub-Signature')
  const twitterSignature = headers.get('X-Twitter-Webhook-Signature')
  const linkedinSignature = headers.get('X-Li-Signature')

  // Check if we have any signature
  if (!webhookSecret && !hubSignature && !twitterSignature && !linkedinSignature) {
    return {
      success: false,
      error: 'Missing webhook signature header'
    }
  }

  // Get payload body for HMAC verification
  const payload = await req.clone().text()

  // First, get all platforms to check against
  const { data: platforms, error: platformsError } = await supabase
    .from('social_platforms')
    .select('id, platform_type, webhook_secret')
    .not('webhook_secret', 'is', null)

  if (platformsError || !platforms || platforms.length === 0) {
    return {
      success: false,
      error: 'No platforms with webhook secrets registered'
    }
  }

  // Try to verify against each platform
  for (const platform of platforms) {
    const signatureHeaders = SIGNATURE_HEADERS[platform.platform_type] || ['X-Webhook-Secret']

    // Check each signature header for this platform
    for (const headerName of signatureHeaders) {
      const headerValue = headers.get(headerName)

      if (!headerValue) {
        continue
      }

      // Simple secret match (X-Webhook-Secret and others)
      if (headerName === 'X-Webhook-Secret' || headerName.includes('Secret')) {
        if (headerValue === platform.webhook_secret) {
          return {
            success: true,
            platform
          }
        }
      }

      // HMAC SHA256 signature verification (X-Hub-Signature-256)
      if (headerName.includes('Signature') || headerName.includes('Sign')) {
        const isValid = await verifyHMACSignature(payload, headerValue, platform.webhook_secret)

        if (isValid) {
          return {
            success: true,
            platform
          }
        }
      }
    }
  }

  return {
    success: false,
    error: 'Invalid webhook signature'
  }
}

/**
 * Verify webhook signature by platform type (optimized lookup)
 */
export async function verifyWebhookByPlatform(
  req: Request,
  platformType: string,
  supabase: any
): Promise<VerificationResult> {
  const signatureHeaders = SIGNATURE_HEADERS[platformType] || ['X-Webhook-Secret']

  // Try to find a matching signature header
  for (const headerName of signatureHeaders) {
    const headerValue = req.headers.get(headerName)

    if (!headerValue) {
      continue
    }

    // Lookup platforms of this type
    const { data: platforms, error: platformsError } = await supabase
      .from('social_platforms')
      .select('id, platform_type, webhook_secret')
      .eq('platform_type', platformType)
      .not('webhook_secret', 'is', null)

    if (platformsError || !platforms) {
      return {
        success: false,
        error: `No platforms found for type: ${platformType}`
      }
    }

    // Try each platform's secret
    for (const platform of platforms) {
      // Simple secret match
      if (headerName.includes('Secret')) {
        if (headerValue === platform.webhook_secret) {
          return {
            success: true,
            platform
          }
        }
      }

      // HMAC verification
      if (headerName.includes('Signature')) {
        const payload = await req.clone().text()
        const isValid = await verifyHMACSignature(payload, headerValue, platform.webhook_secret)

        if (isValid) {
          return {
            success: true,
            platform
          }
        }
      }
    }
  }

  return {
    success: false,
    error: 'Invalid webhook signature for platform type'
  }
}
