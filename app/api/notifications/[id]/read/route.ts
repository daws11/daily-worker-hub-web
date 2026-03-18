import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const routeLogger = logger.createApiLogger('notifications/[id]/read')

/**
 * PATCH /api/notifications/[id]/read
 * Mark a specific notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { startTime, requestId } = logger.requestStart(request, { route: 'notifications/[id]/read' })
  
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      routeLogger.warn('Unauthorized access attempt', { requestId })
      logger.requestError(request, new Error('Tidak terautentikasi'), 401, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify notification belongs to user and update
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user.id}`,
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
      routeLogger.error('Supabase API error', new Error(errorText), { requestId, status: response.status, notificationId: id, userId: user.id })
      logger.requestError(request, new Error(`Supabase error: ${errorText}`), response.status, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Gagal menandai notifikasi' },
        { status: response.status }
      )
    }

    const updatedNotification = await response.json()

    if (!updatedNotification || updatedNotification.length === 0) {
      routeLogger.warn('Notification not found', { requestId, notificationId: id, userId: user.id })
      logger.requestError(request, new Error('Notifikasi tidak ditemukan'), 404, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Notifikasi tidak ditemukan' },
        { status: 404 }
      )
    }

    routeLogger.info('Notification marked as read', { requestId, notificationId: id, userId: user.id })
    logger.requestSuccess(request, { status: 200 }, startTime, { requestId, userId: user.id })

    return NextResponse.json({
      success: true,
      data: updatedNotification[0]
    })
  } catch (error) {
    routeLogger.error('Unexpected error in PATCH /api/notifications/[id]/read', error, { requestId })
    logger.requestError(request, error, 500, startTime, { requestId })
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: (error as Error).message },
      { status: 500 }
    )
  }
}
