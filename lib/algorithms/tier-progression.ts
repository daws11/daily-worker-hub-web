/**
 * Worker Tier Progression
 *
 * Handles automatic tier updates based on worker performance metrics
 */

import { WorkerTier } from '@/lib/supabase/types';
import { classifyWorkerTier } from './tier-classifier';
import { supabase } from '@/lib/supabase/client';

/**
 * Worker performance metrics for tier calculation
 */
export interface WorkerMetrics {
  jobsCompleted: number;
  rating: number | null;
  punctuality: number | null;
  reliability: number | null;
  cancellationRate: number | null;
}

/**
 * Update a worker's tier based on their performance metrics
 *
 * @param workerId - Worker ID to update
 * @param metrics - Worker performance metrics
 * @returns Updated tier or null if update failed
 */
export async function updateWorkerTier(
  workerId: string,
  metrics: WorkerMetrics
): Promise<WorkerTier | null> {
  try {
    // Calculate the new tier
    const newTier = classifyWorkerTier(
      metrics.jobsCompleted,
      metrics.rating,
      metrics.punctuality
    );

    // Update the worker's tier in the database
    const { error } = await supabase
      .from('workers')
      .update({
        tier: newTier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workerId);

    if (error) {
      console.error('Error updating worker tier:', error);
      return null;
    }

    return newTier;
  } catch (error) {
    console.error('Error in updateWorkerTier:', error);
    return null;
  }
}

/**
 * Recalculate and update tier for all workers (admin function)
 *
 * @returns Number of workers updated
 */
export async function recalculateAllWorkerTiers(): Promise<number> {
  try {
    // Fetch all workers with their metrics
    const { data: workers, error } = await supabase
      .from('workers')
      .select(`
        id,
        jobs_completed,
        rating,
        punctuality,
        tier
      `);

    if (error) {
      console.error('Error fetching workers:', error);
      return 0;
    }

    let updatedCount = 0;

    // Update each worker's tier
    for (const worker of workers || []) {
      const newTier = classifyWorkerTier(
        worker.jobs_completed || 0,
        worker.rating,
        worker.punctuality
      );

      // Only update if tier changed
      if (newTier !== worker.tier) {
        const { error: updateError } = await supabase
          .from('workers')
          .update({
            tier: newTier,
            updated_at: new Date().toISOString(),
          })
          .eq('id', worker.id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    return updatedCount;
  } catch (error) {
    console.error('Error in recalculateAllWorkerTiers:', error);
    return 0;
  }
}

/**
 * Get tier progress information for a worker
 *
 * @param workerId - Worker ID
 * @returns Progress information to next tier
 */
export async function getTierProgress(
  workerId: string
): Promise<{
  currentTier: WorkerTier;
  nextTier: WorkerTier | null;
  progressPercentage: number;
  requirements: {
    jobsCompleted: { current: number; required: number };
    rating: { current: number | null; required: number };
    punctuality: { current: number | null; required: number };
  };
} | null> {
  try {
    // Fetch worker metrics
    const { data: worker, error } = await supabase
      .from('workers')
      .select(`
        tier,
        jobs_completed,
        rating,
        punctuality
      `)
      .eq('id', workerId)
      .single();

    if (error || !worker) {
      console.error('Error fetching worker:', error);
      return null;
    }

    const tierProgression = [
      {
        tier: 'classic' as WorkerTier,
        jobsRequired: 0,
        ratingRequired: 0,
        punctualityRequired: 0,
      },
      {
        tier: 'pro' as WorkerTier,
        jobsRequired: 20,
        ratingRequired: 4.0,
        punctualityRequired: 90,
      },
      {
        tier: 'elite' as WorkerTier,
        jobsRequired: 100,
        ratingRequired: 4.6,
        punctualityRequired: 95,
      },
      {
        tier: 'champion' as WorkerTier,
        jobsRequired: 300,
        ratingRequired: 4.8,
        punctualityRequired: 98,
      },
    ];

    // Find current and next tier
    const currentIndex = tierProgression.findIndex(t => t.tier === worker.tier);
    const currentTier = tierProgression[currentIndex];
    const nextTier = currentIndex < tierProgression.length - 1
      ? tierProgression[currentIndex + 1]
      : null;

    if (!currentTier) {
      return null;
    }

    // Calculate progress percentage
    let progressPercentage = 0;
    if (nextTier) {
      const jobProgress = Math.min(
        ((worker.jobs_completed || 0) / nextTier.jobsRequired) * 100,
        100
      );
      progressPercentage = jobProgress;
    }

    return {
      currentTier: worker.tier,
      nextTier: nextTier?.tier || null,
      progressPercentage,
      requirements: {
        jobsCompleted: {
          current: worker.jobs_completed || 0,
          required: nextTier?.jobsRequired || worker.jobs_completed || 0,
        },
        rating: {
          current: worker.rating,
          required: nextTier?.ratingRequired || worker.rating || 0,
        },
        punctuality: {
          current: worker.punctuality,
          required: nextTier?.punctualityRequired || worker.punctuality || 0,
        },
      },
    };
  } catch (error) {
    console.error('Error in getTierProgress:', error);
    return null;
  }
}

/**
 * Increment jobs completed counter and update tier if needed
 *
 * @param workerId - Worker ID
 * @returns Updated tier or null if update failed
 */
export async function incrementJobsCompleted(workerId: string): Promise<WorkerTier | null> {
  try {
    // Fetch current jobs_completed
    const { data: currentData, error: fetchError } = await supabase
      .from('workers')
      .select('jobs_completed')
      .eq('id', workerId)
      .single();

    if (fetchError) {
      console.error('Error fetching current jobs count:', fetchError);
      return null;
    }

    const newJobsCount = (currentData?.jobs_completed || 0) + 1;

    // Update jobs_completed counter
    const { data: worker, error: updateError } = await supabase
      .from('workers')
      .update({
        jobs_completed: newJobsCount,
        updated_at: new Date().toISOString(),
      })
      .select(`
        id,
        jobs_completed,
        rating,
        punctuality,
        tier
      `)
      .eq('id', workerId)
      .single();

    if (updateError || !worker) {
      console.error('Error incrementing jobs completed:', updateError);
      return null;
    }

    // Recalculate tier
    return updateWorkerTier(worker.id, {
      jobsCompleted: worker.jobs_completed || 0,
      rating: worker.rating,
      punctuality: worker.punctuality,
      reliability: null,
      cancellationRate: null,
    });
  } catch (error) {
    console.error('Error in incrementJobsCompleted:', error);
    return null;
  }
}
