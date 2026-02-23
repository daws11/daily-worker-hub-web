// ============================================================================
// Social Distribute Edge Function
// ============================================================================
// Orchestrates multi-platform posting of job listings to social media
//
// POST /functions/v1/social-distribute
// Body: {
//   job_id: string,
//   business_id?: string,
//   platforms?: string[],  // Optional: specific platforms to post to
//   custom_content?: {     // Optional: custom content per platform
//     facebook?: { message?: string, link?: string, image_url?: string },
//     instagram?: { caption?: string, image_url?: string }
//   }
// }
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { job_id, business_id, platforms, custom_content } = await req.json()

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch job details with business info
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        business_id,
        businesses(id, name)
      `)
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use provided business_id or default to job's business_id
    const targetBusinessId = business_id || job.business_id

    // Fetch all active social connections for the business
    const { data: connections, error: connectionsError } = await supabase
      .from('business_social_connections')
      .select(`
        id,
        platform_type,
        status,
        social_platforms(id, platform_type, platform_name)
      `)
      .eq('business_id', targetBusinessId)
      .eq('status', 'active')

    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`)
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active social connections found for this business',
          results: [],
          job_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group connections by platform type
    const platformConnections = connections.reduce((acc: Record<string, any[]>, conn: any) => {
      const platformType = conn.social_platforms?.platform_type || conn.platform_type
      if (!acc[platformType]) {
        acc[platformType] = []
      }
      acc[platformType].push(conn)
      return acc
    }, {})

    // Filter to specific platforms if provided
    const targetPlatforms = platforms && platforms.length > 0
      ? platforms
      : Object.keys(platformConnections)

    // Distribute to each platform
    const results: Array<{
      platform: string
      connection_id: string
      success: boolean
      post_id?: string
      platform_post_id?: string
      platform_post_url?: string
      already_posted?: boolean
      error?: string
    }> = []

    const functionUrlBase = Deno.env.get('SUPABASE_URL')?.replace('/co', '') || 'http://localhost:54321'

    for (const platformType of targetPlatforms) {
      const platformConns = platformConnections[platformType]

      if (!platformConns || platformConns.length === 0) {
        results.push({
          platform: platformType,
          connection_id: '',
          success: false,
          error: `No active connection found for ${platformType}`,
        })
        continue
      }

      // Post to each connection for this platform
      for (const conn of platformConns) {
        const connectionId = conn.id
        const platformFunctionName = platformType === 'facebook' ? 'social-facebook' :
                                    platformType === 'instagram' ? 'social-instagram' :
                                    null

        if (!platformFunctionName) {
          results.push({
            platform: platformType,
            connection_id: connectionId,
            success: false,
            error: `Unsupported platform: ${platformType}`,
          })
          continue
        }

        try {
          // Call the platform-specific edge function
          const functionUrl = `${functionUrlBase}/functions/v1/${platformFunctionName}`

          const payload: Record<string, any> = {
            job_id,
            connection_id: connectionId,
          }

          // Add custom content for this platform if provided
          if (custom_content && custom_content[platformType as keyof typeof custom_content]) {
            payload.custom_content = custom_content[platformType as keyof typeof custom_content]
          }

          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'apikey': supabaseAnonKey,
            },
            body: JSON.stringify(payload),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            results.push({
              platform: platformType,
              connection_id: connectionId,
              success: true,
              post_id: data.post_id,
              platform_post_id: data.platform_post_id,
              platform_post_url: data.platform_post_url,
              already_posted: data.already_posted,
            })
          } else {
            results.push({
              platform: platformType,
              connection_id: connectionId,
              success: false,
              error: data.error || data.details || 'Failed to post',
            })
          }
        } catch (error) {
          results.push({
            platform: platformType,
            connection_id: connectionId,
            success: false,
            error: error.message || 'Failed to call platform function',
          })
        }
      }
    }

    // Calculate summary statistics
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const alreadyPosted = results.filter(r => r.already_posted).length

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        business_id: targetBusinessId,
        results,
        summary: {
          total: results.length,
          successful,
          failed,
          already_posted: alreadyPosted,
        },
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
