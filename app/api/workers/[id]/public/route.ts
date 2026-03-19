/**
 * Worker Public Profile API Route
 * 
 * Returns public worker profile data for the marketplace.
 * Only includes public-safe information (no email, phone, address).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BADGE_DEFINITIONS, BadgeWithProgress } from '@/lib/badges'

/**
 * @openapi
 * /api/workers/{id}/public:
 *   get:
 *     tags:
 *       - Workers
 *     summary: Get public worker profile
 *     description: Retrieve public profile information for a worker. Public endpoint - no authentication required. Only returns safe, public information.
 *     security: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Worker ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Public worker profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkerPublic'
 *       404:
 *         description: Worker not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch worker profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params
    const supabase = await createClient()

    // Fetch worker basic info
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select(`
        id,
        full_name,
        avatar_url,
        bio,
        tier,
        rating,
        jobs_completed,
        created_at,
        kyc_status
      `)
      .eq('id', workerId)
      .single()

    if (workerError || !worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      )
    }

    // Fetch worker skills
    const { data: workerSkills, error: skillsError } = await supabase
      .from('worker_skills')
      .select(`
        skill_id,
        skills (
          id,
          name,
          slug
        )
      `)
      .eq('worker_id', workerId)

    const skills = workerSkills?.map(ws => ({
      id: ws.skills?.id,
      name: ws.skills?.name,
      slug: ws.skills?.slug
    })).filter(Boolean) || []

    // Fetch worker badges
    const { data: workerBadges, error: badgesError } = await supabase
      .from('worker_badges')
      .select(`
        badge_id,
        verification_status,
        verified_at,
        created_at,
        badges (
          id,
          name,
          slug,
          icon,
          description,
          category
        )
      `)
      .eq('worker_id', workerId)
      .eq('verification_status', 'verified')

    const badges = workerBadges?.map(wb => ({
      id: wb.badges?.id,
      name: wb.badges?.name,
      slug: wb.badges?.slug,
      icon: wb.badges?.icon,
      description: wb.badges?.description,
      category: wb.badges?.category,
      earnedAt: wb.verified_at || wb.created_at
    })).filter(Boolean) || []

    // Fetch reviews count
    const { count: reviewsCount, error: reviewsError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('worker_id', workerId)

    // Check current availability
    const today = new Date()
    const dayOfWeek = today.getDay()
    const currentHour = today.getHours()

    const { data: availability, error: availError } = await supabase
      .from('worker_availabilities')
      .select('*')
      .eq('worker_id', workerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .lte('start_hour', currentHour)
      .gte('end_hour', currentHour)
      .maybeSingle()

    const isAvailable = !!availability

    // Calculate years of experience
    const createdAt = new Date(worker.created_at)
    const now = new Date()
    const yearsOfExperience = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365)
    )

    // Calculate average rating (from reviews table for accuracy)
    const { data: ratingData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('worker_id', workerId)

    let avgRating = worker.rating
    if (ratingData && ratingData.length > 0) {
      avgRating = ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length
    }

    // Fetch achievement badges
    const { data: achievementBadges } = await supabase
      .from('worker_achievements')
      .select('badge_type, earned_at')
      .eq('worker_id', workerId)

    const achievementBadgeTypes = new Set(
      achievementBadges?.map(ab => ab.badge_type) || []
    )

    const earnedAchievements: BadgeWithProgress[] = BADGE_DEFINITIONS
      .filter(badge => achievementBadgeTypes.has(badge.type))
      .map(badge => {
        const earned = achievementBadges?.find(ab => ab.badge_type === badge.type)
        return {
          ...badge,
          earned: true,
          earnedAt: earned?.earned_at
        }
      })

    // Build public profile response
    const publicProfile = {
      id: worker.id,
      fullName: worker.full_name,
      avatarUrl: worker.avatar_url,
      bio: worker.bio,
      tier: worker.tier,
      skills,
      stats: {
        jobsCompleted: worker.jobs_completed || 0,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewsCount: reviewsCount || 0,
        yearsOfExperience: Math.max(yearsOfExperience, 0)
      },
      badges,
      achievements: earnedAchievements,
      isAvailable,
      isVerified: worker.kyc_status === 'approved',
      joinedAt: worker.created_at
    }

    return NextResponse.json(publicProfile)

  } catch (error) {
    console.error('Error fetching public worker profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch worker profile' },
      { status: 500 }
    )
  }
}
