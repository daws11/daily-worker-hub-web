/**
 * Worker Reliability History API Route
 *
 * Returns reliability score history for a worker.
 * Public endpoint - no authentication required.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * @openapi
 * /api/workers/{id}/reliability-history:
 *   get:
 *     tags:
 *       - Workers
 *     summary: Get worker reliability history
 *     description: Retrieve reliability score history for a worker. Public endpoint - no authentication required.
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
 *         description: Worker reliability history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       worker_id:
 *                         type: string
 *                       score:
 *                         type: number
 *                       attendance_rate:
 *                         type: number
 *                       punctuality_rate:
 *                         type: number
 *                       avg_rating:
 *                         type: number
 *                       completed_jobs_count:
 *                         type: number
 *                       calculated_at:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Worker not found
 *       500:
 *         description: Failed to fetch reliability history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workerId } = await params;

    const supabase = await createClient();

    // Fetch reliability score history
    const { data: history, error } = await supabase
      .from("reliability_score_history")
      .select("*")
      .eq("worker_id", workerId)
      .order("calculated_at", { ascending: true });

    if (error) {
      console.error("Error fetching reliability history:", error);
      return NextResponse.json(
        { error: "Failed to fetch reliability history" },
        { status: 500 },
      );
    }

    // Transform data to match the expected format
    const formattedHistory = (history || []).map((entry) => ({
      id: entry.id,
      worker_id: entry.worker_id,
      score: entry.score,
      attendance_rate: entry.attendance_rate,
      punctuality_rate: entry.punctuality_rate,
      avg_rating: entry.avg_rating,
      completed_jobs_count: entry.completed_jobs_count,
      calculated_at: entry.calculated_at,
      created_at: entry.created_at,
    }));

    return NextResponse.json({ data: formattedHistory });
  } catch (error) {
    console.error("Error fetching reliability history:", error);
    return NextResponse.json(
      { error: "Failed to fetch reliability history" },
      { status: 500 },
    );
  }
}
