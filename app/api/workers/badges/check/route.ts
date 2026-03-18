import { NextResponse } from 'next/server'
import { checkAndAwardBadges, getWorkerAchievements } from '@/lib/badges'

/**
 * POST /api/workers/badges/check
 * Check and award new badges for a worker (internal trigger)
 * 
 * Body: { worker_id: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { worker_id } = body

    if (!worker_id) {
      return NextResponse.json(
        { error: 'worker_id is required' },
        { status: 400 }
      )
    }

    // Check and award badges
    const result = await checkAndAwardBadges(worker_id)

    // Get updated achievements
    const allBadges = await getWorkerAchievements(worker_id)

    return NextResponse.json({
      success: true,
      awarded: result.awarded,
      awardedCount: result.awarded.length,
      progress: result.progress,
      allBadges
    })
  } catch (error) {
    console.error('Error in POST /api/workers/badges/check:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
