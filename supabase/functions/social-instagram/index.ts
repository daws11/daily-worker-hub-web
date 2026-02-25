// ============================================================================
// Social Instagram Edge Function
// ============================================================================
// Posts job listings to Instagram using the Instagram Graph API
//
// POST /functions/v1/social-instagram
// Body: {
//   job_id: string,
//   connection_id: string,
//   custom_content?: { caption?: string, image_url?: string }
// }
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Default hashtags for Bali job postings
const DEFAULT_HASHTAGS = [
  '#BaliJobs',
  '#LowonganKerjaBali',
  '#BaliHospitality',
  '#BaliRestaurant',
  '#KerjaBali',
]

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { job_id, connection_id, custom_content } = await req.json()

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: 'connection_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch job details with business and category info
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        description,
        requirements,
        budget_min,
        budget_max,
        status,
        deadline,
        address,
        businesses(id, name),
        job_categories(id, name, slug)
      `)
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch connection details with platform info
    const { data: connection, error: connectionError } = await supabase
      .from('business_social_connections')
      .select(`
        id,
        access_token,
        platform_account_id,
        platform_account_name,
        status,
        settings,
        social_platforms(id, platform_type, platform_name)
      `)
      .eq('id', connection_id)
      .single()

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify connection is active
    if (connection.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Connection is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify this is an Instagram connection
    if (connection.social_platforms.platform_type !== 'instagram') {
      return new Response(
        JSON.stringify({ error: 'Connection is not for Instagram platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if job post already exists for this connection
    const { data: existingPost } = await supabase
      .from('job_posts')
      .select('id, status')
      .eq('job_id', job_id)
      .eq('connection_id', connection_id)
      .single()

    // Skip if already posted
    if (existingPost && existingPost.status === 'posted') {
      return new Response(
        JSON.stringify({
          success: true,
          already_posted: true,
          post_id: existingPost.id,
          message: 'Job already posted to Instagram',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format the caption for Instagram
    const businessName = job.businesses?.name || 'Daily Worker Hub'
    const categoryName = job.job_categories?.name || ''

    // Build caption with emoji formatting
    const caption = custom_content?.caption || buildInstagramCaption({
      title: job.title,
      description: job.description,
      businessName,
      categoryName,
      budgetMin: job.budget_min,
      budgetMax: job.budget_max,
      location: job.address,
      hashtags: connection.settings?.default_hashtags || DEFAULT_HASHTAGS,
    })

    // Get or create job post entry
    let jobPostId = existingPost?.id

    if (!jobPostId) {
      // Create job post entry
      const { data: newPost, error: postError } = await supabase
        .from('job_posts')
        .insert({
          job_id: job_id,
          connection_id: connection_id,
          content: {
            caption,
            hashtags: connection.settings?.default_hashtags || DEFAULT_HASHTAGS,
          },
          post_type: 'image',
          status: 'pending',
        })
        .select('id')
        .single()

      if (postError) {
        throw new Error(`Failed to create job post entry: ${postError.message}`)
      }

      jobPostId = newPost.id
    }

    // Get Instagram business account ID
    const instagramAccountId = connection.platform_account_id
    const pageAccessToken = connection.access_token

    if (!instagramAccountId) {
      await markJobPostFailed(supabase, jobPostId, 'Instagram account ID not found', 'NO_ACCOUNT_ID')
      return new Response(
        JSON.stringify({ error: 'Instagram account ID not found in connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use custom image URL or generate one from job details
    // For now, we'll create a text-based post
    // In production, you'd upload an image to Supabase Storage first
    const imageUrl = custom_content?.image_url || generateJobImageUrl(job)

    // Step 1: Create a media container
    const containerUrl = new URL(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media`
    )

    const containerParams = new URLSearchParams({
      image_url: imageUrl,
      caption: caption,
      access_token: pageAccessToken,
    })

    const containerResponse = await fetch(`${containerUrl}?${containerParams}`, {
      method: 'POST',
    })

    const containerData = await containerResponse.json()

    if (!containerResponse.ok || containerData.error) {
      const errorMessage = containerData.error?.message || 'Failed to create media container'
      await markJobPostFailed(supabase, jobPostId, errorMessage, containerData.error?.code)
      return new Response(
        JSON.stringify({
          error: 'Failed to create Instagram media container',
          details: errorMessage,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const containerId = containerData.id

    // Step 2: Publish the container
    const publishUrl = new URL(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`
    )

    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: pageAccessToken,
    })

    const publishResponse = await fetch(`${publishUrl}?${publishParams}`, {
      method: 'POST',
    })

    const publishData = await publishResponse.json()

    if (!publishResponse.ok || publishData.error) {
      const errorMessage = publishData.error?.message || 'Failed to publish media'
      await markJobPostFailed(supabase, jobPostId, errorMessage, publishData.error?.code)
      return new Response(
        JSON.stringify({
          error: 'Failed to publish Instagram post',
          details: errorMessage,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the Instagram media ID
    const instagramMediaId = publishData.id

    // Step 3: Get the permalink (optional, for getting the post URL)
    let permalink = null
    try {
      const mediaUrl = new URL(`https://graph.facebook.com/v18.0/${instagramMediaId}`)
      mediaUrl.searchParams.set('fields', 'permalink')
      mediaUrl.searchParams.set('access_token', pageAccessToken)

      const mediaResponse = await fetch(mediaUrl.toString())
      const mediaData = await mediaResponse.json()

      if (mediaResponse.ok && mediaData.permalink) {
        permalink = mediaData.permalink
      }
    } catch {
      // Ignore errors fetching permalink
    }

    // Mark job post as successfully posted
    await markJobPostPosted(supabase, jobPostId, instagramMediaId, permalink)

    // Update connection last_used_at
    await updateConnectionLastUsed(supabase, connection_id)

    return new Response(
      JSON.stringify({
        success: true,
        posted: true,
        post_id: jobPostId,
        platform_post_id: instagramMediaId,
        platform_post_url: permalink,
        caption: caption,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Builds an Instagram-optimized caption for a job posting
 */
function buildInstagramCaption(params: {
  title: string
  description: string
  businessName: string
  categoryName: string
  budgetMin?: number | null
  budgetMax?: number | null
  location?: string | null
  hashtags: string[]
}): string {
  const {
    title,
    description,
    businessName,
    categoryName,
    budgetMin,
    budgetMax,
    location,
    hashtags,
  } = params

  // Build budget string
  let budgetStr = ''
  if (budgetMin !== null && budgetMin !== undefined) {
    if (budgetMax && budgetMax > budgetMin) {
      budgetStr = `💰 ${formatCurrency(budgetMin)} - ${formatCurrency(budgetMax)}`
    } else {
      budgetStr = `💰 ${formatCurrency(budgetMin)}`
    }
  }

  // Build location string
  const locationStr = location ? `📍 ${location}` : ''

  // Format description (truncate if too long for Instagram)
  const maxLength = 2200 // Instagram caption limit
  const descriptionStr = description.length > 500
    ? description.substring(0, 500) + '...'
    : description

  // Build category tag
  const categoryTag = categoryName ? `#${categoryName.replace(/\s+/g, '')}` : ''

  // Combine all parts
  let caption = `🎯 ${title}\n\n`

  if (categoryName) {
    caption += `${categoryTag}\n\n`
  }

  caption += `${descriptionStr}\n\n`

  if (budgetStr) {
    caption += `${budgetStr}\n`
  }

  if (locationStr) {
    caption += `${locationStr}\n`
  }

  caption += `\n📱 Apply now at Daily Worker Hub\n\n`

  // Add hashtags
  caption += hashtags.join(' ')

  // Ensure caption is within Instagram's limit
  if (caption.length > maxLength) {
    // Truncate hashtags if needed
    const baseCaption = caption.substring(0, maxLength - 100)
    caption = baseCaption + '\n\n' + hashtags.slice(0, 10).join(' ')
  }

  return caption
}

/**
 * Formats currency in IDR (Indonesian Rupiah)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Generates a placeholder image URL for job postings
 * In production, this should use actual uploaded images
 */
function generateJobImageUrl(job: any): string {
  // Using a placeholder service for now
  // In production, generate actual images with job details
  const baseUrl = 'https://placehold.co/1080x1080/1E40AF/FFFFFF/png'
  const text = encodeURIComponent(job.title)
  return `${baseUrl}?text=${text}`
}

/**
 * Marks a job post as failed in the database
 */
async function markJobPostFailed(
  supabase: any,
  post_id: string,
  error_message: string,
  error_code?: string
): Promise<void> {
  try {
    await supabase
      .from('job_posts')
      .update({
        status: 'failed',
        error_message,
        error_code: error_code || null,
        retry_count: supabase.raw('retry_count + 1'),
        last_retry_at: new Date().toISOString(),
      })
      .eq('id', post_id)
  } catch {
    // Ignore errors updating job post status
  }
}

/**
 * Marks a job post as successfully posted in the database
 */
async function markJobPostPosted(
  supabase: any,
  post_id: string,
  platform_post_id: string,
  platform_post_url?: string | null
): Promise<void> {
  try {
    await supabase
      .from('job_posts')
      .update({
        status: 'posted',
        platform_post_id,
        platform_post_url: platform_post_url || null,
        posted_at: new Date().toISOString(),
        error_message: null,
        error_code: null,
      })
      .eq('id', post_id)
  } catch {
    // Ignore errors updating job post status
  }
}

/**
 * Updates the last_used_at timestamp for a connection
 */
async function updateConnectionLastUsed(
  supabase: any,
  connection_id: string
): Promise<void> {
  try {
    await supabase
      .from('business_social_connections')
      .update({
        last_used_at: new Date().toISOString(),
      })
      .eq('id', connection_id)
  } catch {
    // Ignore errors updating connection
  }
}
