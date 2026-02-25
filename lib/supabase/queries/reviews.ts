import { supabase } from "../client"
import type { Database } from "../types"

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"]
type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"]
type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"]

export type ReviewWithDetails = ReviewRow & {
  worker?: {
    id: string
    full_name: string
    avatar_url: string
  }
  business?: {
    id: string
    name: string
    avatar_url?: string
  }
  booking?: {
    id: string
    job?: {
      id: string
      title: string
    }
  }
}

/**
 * Get reviews for a worker (reviews from businesses)
 */
export async function getReviewsForWorker(workerId: string) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        business:businesses!inner(
          id,
          name
        ),
        booking:bookings!inner(
          id,
          job:jobs!inner(
            id,
            title
          )
        )
      `)
      .eq('worker_id', workerId)
      .eq('reviewer', 'business')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching worker reviews:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker reviews:', error)
    return { data: null, error }
  }
}

/**
 * Get reviews for a business (reviews from workers)
 */
export async function getReviewsForBusiness(businessId: string) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        ),
        booking:bookings!inner(
          id,
          job:jobs!inner(
            id,
            title
          )
        )
      `)
      .eq('business_id', businessId)
      .eq('reviewer', 'worker')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching business reviews:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching business reviews:', error)
    return { data: null, error }
  }
}

/**
 * Get a review by booking ID and reviewer type
 * This is useful to check if a review already exists for a booking
 */
export async function getReviewByBookingAndType(
  bookingId: string,
  reviewerType: 'business' | 'worker'
) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('reviewer', reviewerType)
      .maybeSingle()

    if (error) {
      console.error('Error fetching review by booking and type:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching review by booking and type:', error)
    return { data: null, error }
  }
}

/**
 * Get a single review by ID
 */
export async function getReviewById(reviewId: string) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        ),
        business:businesses!inner(
          id,
          name
        ),
        booking:bookings!inner(
          id,
          job:jobs!inner(
            id,
            title
          )
        )
      `)
      .eq('id', reviewId)
      .single()

    if (error) {
      console.error('Error fetching review:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching review:', error)
    return { data: null, error }
  }
}

/**
 * Create a new review
 */
export async function createReview(review: Omit<ReviewInsert, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single()

    if (error) {
      console.error('Error creating review:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error creating review:', error)
    return { data: null, error }
  }
}

/**
 * Update an existing review
 */
export async function updateReview(
  reviewId: string,
  updates: ReviewUpdate
) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', reviewId)
      .select()
      .single()

    if (error) {
      console.error('Error updating review:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error updating review:', error)
    return { data: null, error }
  }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string) {
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)

    if (error) {
      console.error('Error deleting review:', error)
      return { error }
    }

    return { error: null }
  } catch (error) {
    console.error('Unexpected error deleting review:', error)
    return { error }
  }
}

/**
 * Get average rating for a worker
 * Returns the average rating from all reviews by businesses
 */
export async function getWorkerAverageRating(workerId: string) {
  try {
    const { data, error, count } = await supabase
      .from('reviews')
      .select('rating', { count: 'exact' })
      .eq('worker_id', workerId)
      .eq('reviewer', 'business')

    if (error) {
      console.error('Error fetching worker average rating:', error)
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: { average: null, count: 0 }, error: null }
    }

    const sum = data.reduce((acc, review) => acc + (review.rating || 0), 0)
    const average = sum / data.length

    const result = {
      average: Math.round(average * 10) / 10, // Round to 1 decimal place
      count: count || 0
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker average rating:', error)
    return { data: null, error }
  }
}

/**
 * Get average rating for a business
 * Returns the average rating from all reviews by workers
 */
export async function getBusinessAverageRating(businessId: string) {
  try {
    const { data, error, count } = await supabase
      .from('reviews')
      .select('rating', { count: 'exact' })
      .eq('business_id', businessId)
      .eq('reviewer', 'worker')

    if (error) {
      console.error('Error fetching business average rating:', error)
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: { average: null, count: 0 }, error: null }
    }

    const sum = data.reduce((acc, review) => acc + (review.rating || 0), 0)
    const average = sum / data.length

    const result = {
      average: Math.round(average * 10) / 10, // Round to 1 decimal place
      count: count || 0
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error fetching business average rating:', error)
    return { data: null, error }
  }
}

/**
 * Get rating breakdown for a worker
 * Returns distribution of ratings (1-5 stars)
 */
export async function getWorkerRatingBreakdown(workerId: string) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('worker_id', workerId)
      .eq('reviewer', 'business')

    if (error) {
      console.error('Error fetching worker rating breakdown:', error)
      return { data: null, error }
    }

    const breakdown = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    }

    if (data) {
      data.forEach(review => {
        const rating = review.rating || 0
        if (rating >= 1 && rating <= 5) {
          breakdown[rating as keyof typeof breakdown]++
        }
      })
    }

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
    const percentages = {
      5: total > 0 ? Math.round((breakdown[5] / total) * 100) : 0,
      4: total > 0 ? Math.round((breakdown[4] / total) * 100) : 0,
      3: total > 0 ? Math.round((breakdown[3] / total) * 100) : 0,
      2: total > 0 ? Math.round((breakdown[2] / total) * 100) : 0,
      1: total > 0 ? Math.round((breakdown[1] / total) * 100) : 0
    }

    return { data: { breakdown, percentages, total }, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker rating breakdown:', error)
    return { data: null, error }
  }
}

/**
 * Get "would rehire" percentage for a worker
 * Percentage of businesses that said they would rehire the worker
 */
export async function getWorkerRehireRate(workerId: string) {
  try {
    const { data, error, count } = await supabase
      .from('reviews')
      .select('would_rehire', { count: 'exact' })
      .eq('worker_id', workerId)
      .eq('reviewer', 'business')
      .not('would_rehire', 'is', null)

    if (error) {
      console.error('Error fetching worker rehire rate:', error)
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: { rehireRate: null, count: 0 }, error: null }
    }

    const wouldRehireCount = data.filter(review => review.would_rehire === true).length
    const rehireRate = (wouldRehireCount / data.length) * 100

    return { data: { rehireRate: Math.round(rehireRate), count: count || 0 }, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker rehire rate:', error)
    return { data: null, error }
  }
}
