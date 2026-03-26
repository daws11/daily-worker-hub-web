/**
 * Job Applications API Routes
 *
 * Endpoints for managing job applications in the Daily Worker Hub platform.
 * Workers can apply to jobs and businesses can view applicants.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import {
  createJobApplication,
  getApplicationsByJob,
  getApplicationsByWorker,
} from "@/lib/actions/job-applications";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  forbiddenErrorResponse,
  notFoundErrorResponse,
  validationErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("applications");

/**
 * @openapi
 * /api/applications:
 *   get:
 *     tags:
 *       - Applications
 *     summary: Get job applications
 *     description: Retrieve job applications. Businesses can view applicants for their jobs, workers can view their own applications.
 *     parameters:
 *       - name: job_id
 *         in: query
 *         description: Filter by job ID (for businesses)
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: worker_id
 *         in: query
 *         description: Filter by worker ID (for workers viewing their applications)
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: business_id
 *         in: query
 *         description: Business ID (required when using job_id)
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: status
 *         in: query
 *         description: Filter by application status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *     responses:
 *       200:
 *         description: List of applications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Not authorized to view these applications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "applications",
  });

  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      routeLogger.warn("Unauthorized access attempt", { requestId });
      logger.requestError(request, new Error("Unauthorized"), 401, startTime, {
        requestId,
      });

      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const workerId = searchParams.get("worker_id");
    const businessId = searchParams.get("business_id");
    const status = searchParams.get("status") || undefined;

    const supabase = await createClient();

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      routeLogger.warn("User not found", {
        requestId,
        userId: session.user.id,
      });
      logger.requestError(
        request,
        new Error("User not found"),
        404,
        startTime,
        { requestId },
      );

      return notFoundErrorResponse("User", session.user.id, request);
    }

    // Business viewing applicants for a job
    if (jobId && businessId && user.role === "business") {
      // Verify business belongs to user
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .eq("user_id", session.user.id)
        .single();

      if (!business) {
        routeLogger.warn("Business not found or unauthorized", {
          requestId,
          businessId,
        });
        logger.requestError(
          request,
          new Error("Unauthorized - Business not found"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("Unauthorized - Business not found", request);
      }

      const result = await getApplicationsByJob(jobId, businessId);

      if (!result.success) {
        routeLogger.error(
          "Failed to get applications by job",
          new Error(result.error),
          { requestId, jobId, businessId },
        );
        logger.requestError(request, new Error(result.error), 400, startTime, {
          requestId,
        });

        return errorResponse(400, result.error, request);
      }

      routeLogger.info("Applications fetched for business", {
        requestId,
        jobId,
        businessId,
        count: result.data?.length || 0,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, {
        requestId,
        userId: session.user.id,
      });

      return NextResponse.json({ data: result.data });
    }

    // Worker viewing their applications
    if (workerId && user.role === "worker") {
      // Verify worker belongs to user
      const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("id", workerId)
        .eq("user_id", session.user.id)
        .single();

      if (!worker) {
        routeLogger.warn("Worker not found or unauthorized", {
          requestId,
          workerId,
        });
        logger.requestError(
          request,
          new Error("Unauthorized - Worker not found"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("Unauthorized - Worker not found", request);
      }

      const result = await getApplicationsByWorker(workerId, status);

      if (!result.success) {
        routeLogger.error(
          "Failed to get applications by worker",
          new Error(result.error),
          { requestId, workerId },
        );
        logger.requestError(request, new Error(result.error), 400, startTime, {
          requestId,
        });

        return errorResponse(400, result.error, request);
      }

      routeLogger.info("Applications fetched for worker", {
        requestId,
        workerId,
        count: result.data?.length || 0,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, {
        requestId,
        userId: session.user.id,
      });

      return NextResponse.json({ data: result.data });
    }

    routeLogger.warn("Missing required parameters", { requestId });
    logger.requestError(
      request,
      new Error("Missing required parameters"),
      400,
      startTime,
      { requestId },
    );

    return validationErrorResponse(
      { reason: "Missing required parameters", required: ["job_id or worker_id"] },
      request,
    );
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/applications", error, {
      requestId,
    });

    return handleApiError(error, request, "/api/applications", "GET");
  }
}

/**
 * @openapi
 * /api/applications:
 *   post:
 *     tags:
 *       - Applications
 *     summary: Create a job application
 *     description: Submit an application for a job posting. Workers only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - job_id
 *               - worker_id
 *             properties:
 *               job_id:
 *                 type: string
 *                 format: uuid
 *                 description: Job ID to apply for
 *               worker_id:
 *                 type: string
 *                 format: uuid
 *                 description: Worker ID making the application
 *               cover_letter:
 *                 type: string
 *                 description: Optional cover letter
 *               proposed_wage:
 *                 type: number
 *                 description: Optional proposed wage
 *               availability:
 *                 type: string
 *                 description: Optional availability notes
 *     responses:
 *       201:
 *         description: Application created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Worker not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error or application failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "applications",
  });

  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      routeLogger.warn("Unauthorized access attempt", { requestId });
      logger.requestError(request, new Error("Unauthorized"), 401, startTime, {
        requestId,
      });

      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const body = await request.json();

    // Validate required fields
    if (!body.job_id || !body.worker_id) {
      routeLogger.warn("Missing required fields", { requestId });
      logger.requestError(
        request,
        new Error("Missing required fields: job_id, worker_id"),
        400,
        startTime,
        { requestId },
      );

      return validationErrorResponse(
        { reason: "Missing required fields", required: ["job_id", "worker_id"] },
        request,
      );
    }

    const supabase = await createClient();

    // Verify worker belongs to user
    const { data: worker } = await supabase
      .from("workers")
      .select("id")
      .eq("id", body.worker_id)
      .eq("user_id", session.user.id)
      .single();

    if (!worker) {
      routeLogger.warn("Worker not found or unauthorized", {
        requestId,
        workerId: body.worker_id,
      });
      logger.requestError(
        request,
        new Error("Unauthorized - Worker not found"),
        403,
        startTime,
        { requestId },
      );

      return forbiddenErrorResponse("Unauthorized - Worker not found", request);
    }

    const result = await createJobApplication(body.job_id, body.worker_id, {
      coverLetter: body.cover_letter,
      proposedWage: body.proposed_wage,
      availability: body.availability,
    });

    if (!result.success) {
      routeLogger.error(
        "Failed to create application",
        new Error(result.error),
        { requestId, jobId: body.job_id, workerId: body.worker_id },
      );
      logger.requestError(request, new Error(result.error), 400, startTime, {
        requestId,
      });

      return errorResponse(400, result.error, request);
    }

    routeLogger.info("Application created successfully", {
      requestId,
      applicationId: result.data?.id,
      jobId: body.job_id,
      userId: session.user.id,
    });
    logger.requestSuccess(request, { status: 201 }, startTime, {
      requestId,
      userId: session.user.id,
    });

    return NextResponse.json(
      {
        data: result.data,
        message: "Application submitted successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    routeLogger.error("Unexpected error in POST /api/applications", error, {
      requestId,
    });

    return handleApiError(error, request, "/api/applications", "POST");
  }
}
