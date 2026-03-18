import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const routeLogger = logger.createApiLogger('notifications/token')

/**
 * DELETE /api/notifications/token
 * Remove an FCM device token (called on logout or token invalidation)
 * 
 * Query params:
 * - token: FCM token to remove (optional, removes all tokens if not provided)
 * - deviceId: Device identifier to remove tokens for (optional)
 */
export async function DELETE(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, { route: 'notifications/token' })
  
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      routeLogger.warn('Unauthorized access attempt', { requestId })
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const deviceId = searchParams.get('deviceId')

    if (!token && !deviceId) {
      return NextResponse.json(
        { error: 'Token atau deviceId diperlukan' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', user.id)

    if (token) {
      query = query.eq('token', token)
    }

    if (deviceId) {
      query = query.eq('device_id', deviceId)
    }

    const { error, count } = await query

    if (error) {
      routeLogger.error('Failed to remove FCM token', error, { requestId, userId: user.id })
      return NextResponse.json(
        { error: 'Gagal menghapus token FCM' },
        { status: 500 }
      )
    }

    routeLogger.info('FCM token(s) removed', { requestId, userId: user.id, count })
    logger.requestSuccess(request, { status: 200 }, startTime, { requestId, userId: user.id })

    return NextResponse.json({ 
      success: true, 
      message: 'Token FCM berhasil dihapus',
      count 
    })
  } catch (error) {
    routeLogger.error('Unexpected error in DELETE /api/notifications/token', error, { requestId })
    logger.requestError(request, error, 500, startTime, { requestId })
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/token
 * Get all FCM tokens for the authenticated user
 */
export async function GET(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, { route: 'notifications/token' })
  
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      routeLogger.warn('Unauthorized access attempt', { requestId })
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    const { data: tokens, error } = await supabase
      .from('user_fcm_tokens')
      .select('id, device_type, device_id, device_name, is_active, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      routeLogger.error('Failed to fetch FCM tokens', error, { requestId, userId: user.id })
      return NextResponse.json(
        { error: 'Gagal mengambil token FCM' },
        { status: 500 }
      )
    }

    routeLogger.info('FCM tokens fetched', { requestId, userId: user.id, count: tokens?.length || 0 })
    logger.requestSuccess(request, { status: 200 }, startTime, { requestId, userId: user.id })

    return NextResponse.json({ 
      success: true,
      data: tokens || []
    })
  } catch (error) {
    routeLogger.error('Unexpected error in GET /api/notifications/token', error, { requestId })
    logger.requestError(request, error, 500, startTime, { requestId })
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: (error as Error).message },
      { status: 500 }
    )
  }
}
