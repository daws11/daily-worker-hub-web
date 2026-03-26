// @ts-nocheck
"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import {
  calculateScore,
  getScoreHistory,
  getWorkerScore,
  getWorkerScoreTrend,
  updateScore,
  recordScoreHistory,
} from "../supabase/queries/reliability-score";

type Worker = Database["public"]["Tables"]["workers"]["Row"];
type ReliabilityScoreHistory =
  Database["public"]["Tables"]["reliability_score_history"]["Row"];

export interface ScoreBreakdown {
  score: number;
  attendance_rate: number;
  punctuality_rate: number;
  avg_rating: number;
  completed_jobs_count: number;
}

export type ScoreCalculationResult = {
  success: boolean;
  error?: string;
  data?: {
    worker: Worker;
    breakdown: ScoreBreakdown;
  };
};

export type WorkerScoreResult = {
  success: boolean;
  error?: string;
  data?: {
    worker: Worker;
    history: ReliabilityScoreHistory[];
  };
};

export type ScoreUpdateResult = {
  success: boolean;
  error?: string;
  data?: Worker;
};

export type ScoreTrend = "improving" | "declining" | "stable";

export type WorkerReliabilityTrend = {
  trend: ScoreTrend;
  score_change: number;
  data_points: number;
};

export type WorkerReliabilityDetailsResult = {
  success: boolean;
  error?: string;
  data?: {
    worker: Worker;
    breakdown: ScoreBreakdown;
    trend: WorkerReliabilityTrend | null;
    history: ReliabilityScoreHistory[];
  };
};

/**
 * Calculate and update reliability score for a worker
 * This should be called after a job is completed
 */
export async function calculateWorkerScore(
  workerId: string,
): Promise<ScoreCalculationResult> {
  try {
    const supabase = await createClient();

    // Verify worker exists
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("*")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      return { success: false, error: "Pekerja tidak ditemukan" };
    }

    // Calculate the score breakdown
    const breakdown = await calculateScore(workerId);

    if (!breakdown) {
      return {
        success: false,
        error: "Tidak dapat menghitung skor - belum ada pekerjaan selesai",
      };
    }

    // Update worker's reliability score
    await updateScore(workerId, breakdown.score);

    // Record score history
    await recordScoreHistory(workerId, breakdown);

    return { success: true, data: { worker, breakdown } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghitung skor",
    };
  }
}

/**
 * Get worker's current reliability score with history
 * Returns both current score and historical changes
 */
export async function getWorkerScoreWithHistory(
  workerId: string,
): Promise<WorkerScoreResult> {
  try {
    const supabase = await createClient();

    // Get current worker data
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("*")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      return { success: false, error: "Pekerja tidak ditemukan" };
    }

    // Get score history
    const history = await getScoreHistory(workerId, 20);

    return { success: true, data: { worker, history } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengambil data skor",
    };
  }
}

/**
 * Trigger a score update for a worker
 * This is typically called automatically after booking completion
 * but can also be triggered manually for recalculation
 */
export async function triggerScoreUpdate(
  workerId: string,
): Promise<ScoreUpdateResult> {
  try {
    const supabase = await createClient();

    // Verify worker exists
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("*")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      return { success: false, error: "Pekerja tidak ditemukan" };
    }

    // Calculate new score
    const breakdown = await calculateScore(workerId);

    if (!breakdown) {
      return {
        success: false,
        error: "Tidak dapat menghitung skor - belum ada pekerjaan selesai",
      };
    }

    // Update worker's reliability score
    const updatedWorker = await updateScore(workerId, breakdown.score);

    // Record score history
    await recordScoreHistory(workerId, breakdown);

    return { success: true, data: updatedWorker };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui skor",
    };
  }
}

/**
 * Get comprehensive reliability details for a worker in one call
 * Returns current score, breakdown, trend, and score history
 */
export async function getWorkerReliabilityDetails(
  workerId: string,
): Promise<WorkerReliabilityDetailsResult> {
  try {
    const supabase = await createClient();

    // Get current worker data
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("*")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      return { success: false, error: "Pekerja tidak ditemukan" };
    }

    // Get score breakdown (current calculation)
    const breakdown = await calculateScore(workerId);

    if (!breakdown) {
      return {
        success: false,
        error: "Tidak dapat menghitung skor - belum ada pekerjaan selesai",
      };
    }

    // Get score trend
    const trend = await getWorkerScoreTrend(workerId);

    // Get score history
    const history = await getScoreHistory(workerId, 20);

    return {
      success: true,
      data: {
        worker,
        breakdown,
        trend: trend
          ? {
              trend: trend.trend,
              score_change: trend.score_change,
              data_points: trend.data_points,
            }
          : null,
        history,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil detail reliabilitas",
    };
  }
}
