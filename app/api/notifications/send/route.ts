import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { notificationService } from '@/lib/notifications/service'
import type { NotificationPayload, NotificationType } from '@/lib/notifications/types'

const routeLogger = logger.createApiLogger('notifications/send')

/**
 * POST /api/notifications/send
 * Send a push notification to one or more users
 * 
 * Request body:
 * - userId: Single user ID (optional, use one of userId, userIds, or topic)
 * - userIds: Array of user IDs (optional)
 * - topic: Topic name (optional)
 * - notification: { title, body, icon?, image?, data?, clickAction? }
 * - type: Notification type (required)
 * 
 * Authorization:
 * - Admin: Can send to any user
 * - Business: Can send to workers they have bookings with
 * - Worker: Can only send to themselves (for testing)
 */
export async function POST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, { route: 'notifications/send' })
  
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

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'worker'

    const body = await request.json()
    const { userId, userIds, topic, notification, type } = body

    // Validate notification payload
    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json(
        { error: 'Judul dan isi notifikasi diperlukan' },
        { status: 400 }
      )
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Tipe notifikasi diperlukan' },
        { status: 400 }
      )
    }

    const notificationType = type as NotificationType
    const payload: NotificationPayload = {
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      image: notification.image,
      data: notification.data,
      clickAction: notification.clickAction,
      priority: notification.priority,
    }

    let result

    // Handle different send targets
    if (topic) {
      // Send to topic (admin only)
      if (userRole !== 'admin') {
        return NextResponse.json(
          { error: 'Hanya admin yang dapat mengirim ke topik' },
          { status: 403 }
        )
      }

      result = await notificationService.sendToTopic(topic, payload, notificationType)
      routeLogger.info('Topic notification sent', { requestId, userId: user.id, topic, type })

    } else if (userIds && Array.isArray(userIds)) {
      // Send to multiple users (admin only, or business with booking relationship)
      if (userRole !== 'admin') {
        // For businesses, verify they have booking relationship with all users
        if (userRole === 'business') {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('worker_id')
            .eq('business_id', user.id)
            .in('worker_id', userIds)

          const validWorkerIds = new Set(bookings?.map((b) => b.worker_id) || [])
          const invalidIds = userIds.filter((id) => !validWorkerIds.has(id))

          if (invalidIds.length > 0) {
            return NextResponse.json(
              { error: 'Anda tidak dapat mengirim notifikasi ke beberapa pengguna ini' },
              { status: 403 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Hanya admin atau bisnis yang dapat mengirim ke beberapa pengguna' },
            { status: 403 }
          )
        }
      }

      result = await notificationService.sendToUsers(userIds, payload, notificationType)
      routeLogger.info('Multi-user notification sent', { requestId, userId: user.id, recipientCount: userIds.length, type })

    } else if (userId) {
      // Send to single user
      if (userRole !== 'admin') {
        // Non-admin can only send to themselves or related users
        if (userId !== user.id) {
          if (userRole === 'business') {
            // Check if business has booking with this worker
            const { data: booking } = await supabase
              .from('bookings')
              .select('id')
              .eq('business_id', user.id)
              .eq('worker_id', userId)
              .limit(1)
              .single()

            if (!booking) {
              return NextResponse.json(
                { error: 'Anda tidak dapat mengirim notifikasi ke pengguna ini' },
                { status: 403 }
              )
            }
          } else {
            return NextResponse.json(
              { error: 'Anda tidak dapat mengirim notifikasi ke pengguna lain' },
              { status: 403 }
            )
          }
        }
      }

      result = await notificationService.sendToUser(userId, payload, notificationType)
      routeLogger.info('Single user notification sent', { requestId, userId: user.id, recipientId: userId, type })

    } else {
      return NextResponse.json(
        { error: 'userId, userIds, atau topic diperlukan' },
        { status: 400 }
      )
    }

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId, userId: user.id })

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Notifikasi berhasil dikirim' : 'Gagal mengirim notifikasi',
      ...result,
    })
  } catch (error) {
    routeLogger.error('Unexpected error in POST /api/notifications/send', error, { requestId })
    logger.requestError(request, error, 500, startTime, { requestId })
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: (error as Error).message },
      { status: 500 }
    )
  }
}
