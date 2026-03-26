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
 *                       previous_score:
 *                         type: number
 *                       change_reason:
 *                         type: string
 *                       booking_id:
 *                         type: string
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
      .order("created_at", { ascending: true });

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
      score: entry.new_score ?? 0,
      previous_score: entry.previous_score,
      change_reason: entry.change_reason,
      booking_id: entry.booking_id,
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
