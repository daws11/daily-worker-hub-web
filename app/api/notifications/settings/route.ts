import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * GET /api/notifications/settings
 * Get notification preferences for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    // Fetch notification preferences
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_notification_preferences?user_id=eq.${user.id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${user.app_metadata?.supabase_token || ''}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Gagal mengambil preferensi notifikasi' },
        { status: response.status }
      )
    }

    let preferences = await response.json()

    // If no preferences exist, create default
    if (!preferences || preferences.length === 0) {
      const createResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_notification_preferences`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${user.app_metadata?.supabase_token || ''}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: user.id,
            push_enabled: true,
            new_applications: true,
            booking_status: true,
            payment_confirmation: true,
            new_job_matches: true,
            shift_reminders: true
          })
        }
      )

      if (createResponse.ok) {
        preferences = await createResponse.json()
      }
    }

    return NextResponse.json({
      success: true,
      data: preferences?.[0] || preferences
    })
  } catch (error) {
    console.error('Error in GET /api/notifications/settings:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/settings
 * Update notification preferences for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate allowed fields
    const allowedFields = [
      'push_enabled',
      'new_applications',
      'booking_status',
      'payment_confirmation',
      'new_job_matches',
      'shift_reminders'
    ]

    const updateData: Record<string, boolean> = {}
    for (const field of allowedFields) {
      if (typeof body[field] === 'boolean') {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data yang valid untuk diperbarui' },
        { status: 400 }
      )
    }

    // Check if preferences exist
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/user_notification_preferences?user_id=eq.${user.id}&select=id`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${user.app_metadata?.supabase_token || ''}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const existing = await checkResponse.json()
    let response

    if (existing && existing.length > 0) {
      // Update existing preferences
      response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_notification_preferences?user_id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${user.app_metadata?.supabase_token || ''}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        }
      )
    } else {
      // Create new preferences
      response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_notification_preferences`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${user.app_metadata?.supabase_token || ''}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: user.id,
            ...updateData
          })
        }
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Gagal memperbarui preferensi notifikasi' },
        { status: response.status }
      )
    }

    const updatedPreferences = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Preferensi notifikasi berhasil diperbarui',
      data: updatedPreferences?.[0] || updatedPreferences
    })
  } catch (error) {
    console.error('Error in POST /api/notifications/settings:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: (error as Error).message },
      { status: 500 }
    )
  }
}
