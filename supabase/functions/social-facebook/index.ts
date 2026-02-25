// ============================================================================
// Social Facebook Edge Function
// ============================================================================
// Posts job listings to Facebook using the Facebook Graph API
//
// POST /functions/v1/social-facebook
// Body: {
//   job_id: string,
//   connection_id: string,
//   custom_content?: { message?: string, link?: string, image_url?: string }
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
        platform_page_id,
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

    // Verify this is a Facebook connection
    if (connection.social_platforms.platform_type !== 'facebook') {
      return new Response(
        JSON.stringify({ error: 'Connection is not for Facebook platform' }),
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
          message: 'Job already posted to Facebook',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format the message for Facebook
    const businessName = job.businesses?.name || 'Daily Worker Hub'
    const categoryName = job.job_categories?.name || ''

    // Build message with emoji formatting
    const message = custom_content?.message || buildFacebookMessage({
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
            message,
            hashtags: connection.settings?.default_hashtags || DEFAULT_HASHTAGS,
          },
          post_type: 'text',
          status: 'pending',
        })
        .select('id')
        .single()

      if (postError) {
        throw new Error(`Failed to create job post entry: ${postError.message}`)
      }

      jobPostId = newPost.id
    }

    // Get Facebook page ID and access token
    const pageId = connection.platform_page_id || connection.platform_account_id
    const pageAccessToken = connection.access_token

    if (!pageId) {
      await markJobPostFailed(supabase, jobPostId, 'Facebook page ID not found', 'NO_PAGE_ID')
      return new Response(
        JSON.stringify({ error: 'Facebook page ID not found in connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build post data for Facebook
    const postData: Record<string, string> = {
      message: message,
      access_token: pageAccessToken,
    }

    // Add link if provided or construct job URL
    const jobLink = custom_content?.link || buildJobUrl(job.id)
    if (jobLink) {
      postData.link = jobLink
    }

    // Add image URL if provided
    if (custom_content?.image_url) {
      postData.picture = custom_content.image_url
    } else {
      // Generate a job image
      postData.picture = generateJobImageUrl(job)
    }

    // Post to Facebook page
    const postUrl = new URL(`https://graph.facebook.com/v18.0/${pageId}/feed`)

    const postResponse = await fetch(postUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(postData),
    })

    const postDataResult = await postResponse.json()

    if (!postResponse.ok || postDataResult.error) {
      const errorMessage = postDataResult.error?.message || 'Failed to post to Facebook'
      await markJobPostFailed(supabase, jobPostId, errorMessage, postDataResult.error?.code)
      return new Response(
        JSON.stringify({
          error: 'Failed to post to Facebook',
          details: errorMessage,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the Facebook post ID
    const facebookPostId = postDataResult.id

    // Get the post permalink (optional, for getting the post URL)
    let permalink = null
    try {
      const postInfoUrl = new URL(`https://graph.facebook.com/v18.0/${facebookPostId}`)
      postInfoUrl.searchParams.set('fields', 'permalink_url')
      postInfoUrl.searchParams.set('access_token', pageAccessToken)

      const postInfoResponse = await fetch(postInfoUrl.toString())
      const postInfoData = await postInfoResponse.json()

      if (postInfoResponse.ok && postInfoData.permalink_url) {
        permalink = postInfoData.permalink_url
      }
    } catch {
      // Ignore errors fetching permalink
    }

    // Mark job post as successfully posted
    await markJobPostPosted(supabase, jobPostId, facebookPostId, permalink)

    // Update connection last_used_at
    await updateConnectionLastUsed(supabase, connection_id)

    return new Response(
      JSON.stringify({
        success: true,
        posted: true,
        post_id: jobPostId,
        platform_post_id: facebookPostId,
        platform_post_url: permalink,
        message: message,
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
 * Builds a Facebook-optimized message for a job posting
 */
function buildFacebookMessage(params: {
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

  // Format description (truncate if too long)
  const maxLength = 63206 // Facebook post limit
  const descriptionStr = description.length > 2000
    ? description.substring(0, 2000) + '...'
    : description

  // Build category tag
  const categoryTag = categoryName ? `#${categoryName.replace(/\s+/g, '')}` : ''

  // Combine all parts
  let message = `🎯 ${title}\n\n`

  if (categoryName) {
    message += `${categoryTag}\n\n`
  }

  message += `${descriptionStr}\n\n`

  if (budgetStr) {
    message += `${budgetStr}\n`
  }

  if (locationStr) {
    message += `${locationStr}\n`
  }

  message += `\n📱 Apply now at Daily Worker Hub\n\n`

  // Add hashtags
  message += hashtags.join(' ')

  // Ensure message is within Facebook's limit
  if (message.length > maxLength) {
    // Truncate description if needed
    const baseMessage = message.substring(0, maxLength - 100)
    message = baseMessage + '\n\n' + hashtags.slice(0, 10).join(' ')
  }

  return message
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
 * Builds a URL for the job listing
 */
function buildJobUrl(jobId: string): string {
  // In production, this should use the actual app URL
  const appUrl = Deno.env.get('APP_URL') || 'https://dailyworkerhub.com'
  return `${appUrl}/jobs/${jobId}`
}

/**
 * Generates a placeholder image URL for job postings
 * In production, this should use actual uploaded images
 */
function generateJobImageUrl(job: any): string {
  // Using a placeholder service for now
  // In production, generate actual images with job details
  const baseUrl = 'https://placehold.co/1200x630/1E40AF/FFFFFF/png'
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
