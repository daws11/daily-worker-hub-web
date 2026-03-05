import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * GET /api/notifications
 * Get notifications for the authenticated user
 * Query params:
 * - filter: 'all' | 'unread' | 'read' (default: 'all')
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = `user_id=eq.${user.id}&order=created_at.desc&limit=${limit}&offset=${offset}`

    if (filter === 'unread') {
      query += '&is_read=eq.false'
    } else if (filter === 'read') {
      query += '&is_read=eq.true'
    }

    // Fetch notifications
    const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications?${query}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${user.app_metadata?.supabase_token || ''}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Gagal mengambil notifikasi' },
        { status: response.status }
      )
    }

    const notifications = await response.json()

    // Get unread count
    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&is_read=eq.false&select=id`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${user.app_metadata?.supabase_token || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    )

    let unreadCount = 0
    if (countResponse.ok) {
      const contentRange = countResponse.headers.get('content-range')
      if (contentRange) {
        const total = contentRange.split('/')[1]
        unreadCount = parseInt(total) || 0
      }
    }

    return NextResponse.json({
      data: notifications,
      unreadCount,
      total: notifications?.length || 0
    })
  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for the authenticated user
 */
export async function PATCH(request: NextRequest) {
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

    // Mark all as read
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&is_read=eq.false`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${user.app_metadata?.supabase_token || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ is_read: true })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Gagal menandai notifikasi' },
        { status: response.status }
      )
    }

    const updatedNotifications = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Semua notifikasi telah ditandai sebagai dibaca',
      count: updatedNotifications?.length || 0
    })
  } catch (error) {
    console.error('Error in PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: (error as Error).message },
      { status: 500 }
    )
  }
}
