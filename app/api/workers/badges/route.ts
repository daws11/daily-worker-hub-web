import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { 
  getWorkerAchievements,
  getWorkerEarnedBadges,
  getWorkerBadgeProgress,
  fetchWorkerStats
} from '@/lib/badges'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * GET /api/workers/badges
 * Get current worker's badges and progress
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workerId = searchParams.get('worker_id')
    const filter = searchParams.get('filter') // 'all' | 'earned' | 'progress'

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!workerId) {
      return NextResponse.json(
        { error: 'worker_id is required' },
        { status: 400 }
      )
    }

    // Fetch badges based on filter
    let badges
    switch (filter) {
      case 'earned':
        badges = await getWorkerEarnedBadges(workerId)
        break
      case 'progress':
        badges = await getWorkerBadgeProgress(workerId)
        break
      case 'all':
      default:
        badges = await getWorkerAchievements(workerId)
        break
    }

    // Get worker stats for summary
    const stats = await fetchWorkerStats(workerId)

    return NextResponse.json({
      data: badges,
      stats: stats ? {
        completedJobs: stats.completedJobs,
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        attendanceRate: stats.attendanceRate
      } : null
    })
  } catch (error) {
    console.error('Error in GET /api/workers/badges:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
