/**
 * OpenAPI/Swagger Configuration for Daily Worker Hub API
 *
 * This module configures the OpenAPI specification using swagger-jsdoc.
 * It defines API info, servers, authentication, and common schemas.
 */

import swaggerJsdoc from "swagger-jsdoc";

/**
 * OpenAPI Options
 */
const options: any = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Daily Worker Hub API",
      version: "1.0.0",
      description: `
# Daily Worker Hub API

API for the Daily Worker Hub platform - connecting hospitality businesses in Bali with daily professional workers.

## Features

- **Authentication**: User registration, login, and session management via Supabase Auth
- **Jobs**: Create, search, and manage job postings
- **Bookings**: Manage worker bookings, check-in, check-out, and completion
- **Payments**: Top-up wallet and process withdrawals
- **Workers**: View worker profiles and public information
- **Notifications**: Real-time notification management

## Authentication

Most endpoints require Bearer token authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-access-token>
\`\`\`

Tokens are obtained through Supabase Auth after login/registration.

## Rate Limiting

API endpoints are rate-limited:
- Public endpoints: 30 requests/minute
- Authenticated endpoints: 100 requests/minute
- Payment endpoints: 10 requests/minute

## Error Handling

All errors follow this format:
\`\`\`json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
\`\`\`

## Support

For API support, contact: support@dailyworkerhub.com
      `,
      contact: {
        name: "Daily Worker Hub Support",
        email: "support@dailyworkerhub.com",
        url: "https://dailyworkerhub.com",
      },
      license: {
        name: "Proprietary",
        url: "https://dailyworkerhub.com/terms",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Development server",
      },
      {
        url: "https://staging-api.dailyworkerhub.com/api",
        description: "Staging server",
      },
      {
        url: "https://api.dailyworkerhub.com/api",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Supabase Auth JWT token",
        },
      },
      schemas: {
        // ===== User Schemas =====
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Unique user identifier",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            full_name: {
              type: "string",
              description: "User full name",
            },
            avatar_url: {
              type: "string",
              format: "uri",
              nullable: true,
              description: "User avatar URL",
            },
            role: {
              type: "string",
              enum: ["worker", "business", "admin"],
              description: "User role",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
            },
          },
        },

        // ===== Worker Schemas =====
        Worker: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Unique worker identifier",
            },
            user_id: {
              type: "string",
              format: "uuid",
              description: "Associated user ID",
            },
            full_name: {
              type: "string",
              description: "Worker full name",
            },
            bio: {
              type: "string",
              nullable: true,
              description: "Worker biography",
            },
            avatar_url: {
              type: "string",
              format: "uri",
              nullable: true,
              description: "Worker avatar URL",
            },
            tier: {
              type: "string",
              enum: ["bronze", "silver", "gold", "platinum"],
              description: "Worker tier level",
            },
            rating: {
              type: "number",
              format: "float",
              minimum: 0,
              maximum: 5,
              nullable: true,
              description: "Average worker rating",
            },
            jobs_completed: {
              type: "integer",
              minimum: 0,
              description: "Total completed jobs",
            },
            kyc_status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              description: "KYC verification status",
            },
          },
        },

        WorkerPublic: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            fullName: {
              type: "string",
            },
            avatarUrl: {
              type: "string",
              format: "uri",
              nullable: true,
            },
            bio: {
              type: "string",
              nullable: true,
            },
            tier: {
              type: "string",
              enum: ["bronze", "silver", "gold", "platinum"],
            },
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  name: { type: "string" },
                  slug: { type: "string" },
                },
              },
            },
            stats: {
              type: "object",
              properties: {
                jobsCompleted: { type: "integer" },
                avgRating: { type: "number", nullable: true },
                reviewsCount: { type: "integer" },
                yearsOfExperience: { type: "integer" },
              },
            },
            isAvailable: {
              type: "boolean",
            },
            isVerified: {
              type: "boolean",
            },
          },
        },

        // ===== Business Schemas =====
        Business: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Unique business identifier",
            },
            user_id: {
              type: "string",
              format: "uuid",
              description: "Associated user ID",
            },
            name: {
              type: "string",
              description: "Business name",
            },
            description: {
              type: "string",
              nullable: true,
              description: "Business description",
            },
            address: {
              type: "string",
              description: "Business address",
            },
            phone: {
              type: "string",
              description: "Business phone number",
            },
            is_verified: {
              type: "boolean",
              description: "Whether business is verified",
            },
          },
        },

        // ===== Job Schemas =====
        Job: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Unique job identifier",
            },
            business_id: {
              type: "string",
              format: "uuid",
              description: "Business that posted the job",
            },
            category_id: {
              type: "string",
              format: "uuid",
              description: "Job category ID",
            },
            title: {
              type: "string",
              description: "Job title",
            },
            description: {
              type: "string",
              description: "Job description",
            },
            requirements: {
              type: "string",
              description: "Job requirements",
            },
            budget_min: {
              type: "number",
              description: "Minimum budget/wage",
            },
            budget_max: {
              type: "number",
              description: "Maximum budget/wage",
            },
            hours_needed: {
              type: "integer",
              description: "Hours needed for the job",
            },
            address: {
              type: "string",
              description: "Job location address",
            },
            lat: {
              type: "number",
              nullable: true,
              description: "Latitude coordinate",
            },
            lng: {
              type: "number",
              nullable: true,
              description: "Longitude coordinate",
            },
            deadline: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Job deadline",
            },
            is_urgent: {
              type: "boolean",
              description: "Whether job is urgent",
            },
            status: {
              type: "string",
              enum: ["open", "in_progress", "completed", "cancelled"],
              description: "Job status",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        JobCreate: {
          type: "object",
          required: [
            "business_id",
            "category_id",
            "title",
            "description",
            "budget_min",
            "budget_max",
            "hours_needed",
            "address",
          ],
          properties: {
            business_id: {
              type: "string",
              format: "uuid",
              description: "Business ID posting the job",
            },
            category_id: {
              type: "string",
              format: "uuid",
              description: "Job category ID",
            },
            title: {
              type: "string",
              minLength: 5,
              maxLength: 100,
              description: "Job title",
            },
            description: {
              type: "string",
              minLength: 20,
              description: "Detailed job description",
            },
            requirements: {
              type: "string",
              description: "Job requirements (optional)",
            },
            budget_min: {
              type: "number",
              minimum: 10000,
              description: "Minimum wage in IDR",
            },
            budget_max: {
              type: "number",
              minimum: 10000,
              description: "Maximum wage in IDR",
            },
            hours_needed: {
              type: "integer",
              minimum: 1,
              maximum: 24,
              description: "Hours needed",
            },
            address: {
              type: "string",
              minLength: 10,
              description: "Job location address",
            },
            lat: {
              type: "number",
              description: "Latitude (optional)",
            },
            lng: {
              type: "number",
              description: "Longitude (optional)",
            },
            deadline: {
              type: "string",
              format: "date-time",
              description: "Job deadline (optional)",
            },
            is_urgent: {
              type: "boolean",
              default: false,
              description: "Mark as urgent job",
            },
            overtime_multiplier: {
              type: "number",
              default: 1.0,
              description: "Overtime pay multiplier",
            },
          },
        },

        JobUpdate: {
          type: "object",
          properties: {
            title: {
              type: "string",
              minLength: 5,
              maxLength: 100,
            },
            description: {
              type: "string",
              minLength: 20,
            },
            requirements: {
              type: "string",
            },
            budget_min: {
              type: "number",
              minimum: 10000,
            },
            budget_max: {
              type: "number",
              minimum: 10000,
            },
            hours_needed: {
              type: "integer",
              minimum: 1,
              maximum: 24,
            },
            address: {
              type: "string",
              minLength: 10,
            },
            lat: {
              type: "number",
            },
            lng: {
              type: "number",
            },
            deadline: {
              type: "string",
              format: "date-time",
            },
            is_urgent: {
              type: "boolean",
            },
            status: {
              type: "string",
              enum: ["open", "in_progress", "completed", "cancelled"],
            },
          },
        },

        JobResponse: {
          type: "object",
          properties: {
            data: {
              $ref: "#/components/schemas/Job",
            },
            message: {
              type: "string",
            },
          },
        },

        // ===== Booking Schemas =====
        Booking: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Unique booking identifier",
            },
            job_id: {
              type: "string",
              format: "uuid",
              description: "Associated job ID",
            },
            worker_id: {
              type: "string",
              format: "uuid",
              description: "Worker ID",
            },
            business_id: {
              type: "string",
              format: "uuid",
              description: "Business ID",
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "confirmed",
                "checked_in",
                "in_progress",
                "completed",
                "cancelled",
              ],
              description: "Booking status",
            },
            check_in_time: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            check_out_time: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            total_amount: {
              type: "number",
              description: "Total payment amount",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        BookingCreate: {
          type: "object",
          required: ["job_id", "worker_id"],
          properties: {
            job_id: {
              type: "string",
              format: "uuid",
              description: "Job to book",
            },
            worker_id: {
              type: "string",
              format: "uuid",
              description: "Worker making the booking",
            },
            notes: {
              type: "string",
              description: "Optional booking notes",
            },
          },
        },

        BookingResponse: {
          type: "object",
          properties: {
            data: {
              $ref: "#/components/schemas/Booking",
            },
            message: {
              type: "string",
            },
          },
        },

        // ===== Payment Schemas =====
        PaymentTransaction: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Transaction ID",
            },
            business_id: {
              type: "string",
              format: "uuid",
            },
            amount: {
              type: "number",
              description: "Total amount including fees",
            },
            status: {
              type: "string",
              enum: ["pending", "paid", "failed", "expired", "cancelled"],
            },
            payment_provider: {
              type: "string",
              enum: ["xendit", "midtrans"],
            },
            payment_url: {
              type: "string",
              format: "uri",
              nullable: true,
            },
            fee_amount: {
              type: "number",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        PaymentCreate: {
          type: "object",
          required: ["business_id", "amount"],
          properties: {
            business_id: {
              type: "string",
              format: "uuid",
              description: "Business ID for top-up",
            },
            amount: {
              type: "number",
              minimum: 50000,
              maximum: 10000000,
              description:
                "Top-up amount in IDR (min: 50,000, max: 10,000,000)",
            },
            provider: {
              type: "string",
              enum: ["xendit", "midtrans"],
              default: "xendit",
              description: "Payment provider",
            },
            payment_method: {
              type: "string",
              description: "Payment method (e.g., qris, bank_transfer)",
            },
            customer_email: {
              type: "string",
              format: "email",
              description: "Customer email (optional)",
            },
            customer_name: {
              type: "string",
              description: "Customer name (optional)",
            },
            metadata: {
              type: "object",
              description: "Additional metadata",
            },
          },
        },

        PaymentCreateResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            data: {
              type: "object",
              properties: {
                transaction: {
                  $ref: "#/components/schemas/PaymentTransaction",
                },
                payment: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    invoice_url: { type: "string", format: "uri" },
                    qr_string: { type: "string", nullable: true },
                    token: { type: "string", nullable: true },
                    va_number: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },

        WithdrawRequest: {
          type: "object",
          required: ["workerId", "amount", "bankAccountId"],
          properties: {
            workerId: {
              type: "string",
              format: "uuid",
              description: "Worker ID requesting withdrawal",
            },
            amount: {
              type: "number",
              minimum: 50000,
              maximum: 5000000,
              description:
                "Withdrawal amount in IDR (min: 50,000, max: 5,000,000)",
            },
            bankAccountId: {
              type: "string",
              format: "uuid",
              description: "Bank account ID to withdraw to",
            },
          },
        },

        WithdrawResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                externalId: { type: "string" },
                disbursementId: { type: "string" },
                amount: { type: "number" },
                feeAmount: { type: "number" },
                netAmount: { type: "number" },
                status: { type: "string" },
                bankCode: { type: "string" },
                accountNumber: { type: "string" },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          },
        },

        // ===== Notification Schemas =====
        Notification: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            user_id: {
              type: "string",
              format: "uuid",
            },
            title: {
              type: "string",
            },
            message: {
              type: "string",
            },
            type: {
              type: "string",
              enum: ["booking", "payment", "job", "system", "review"],
            },
            is_read: {
              type: "boolean",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        NotificationListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Notification",
              },
            },
            unreadCount: {
              type: "integer",
            },
            total: {
              type: "integer",
            },
          },
        },

        // ===== Auth Schemas =====
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 6,
              description: "User password",
            },
          },
        },

        RegisterRequest: {
          type: "object",
          required: ["email", "password", "full_name", "role"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 6,
              description: "User password (min 6 characters)",
            },
            full_name: {
              type: "string",
              minLength: 2,
              description: "User full name",
            },
            role: {
              type: "string",
              enum: ["worker", "business"],
              description: "Account type",
            },
            phone: {
              type: "string",
              description: "Phone number (optional)",
            },
          },
        },

        AuthResponse: {
          type: "object",
          properties: {
            user: {
              $ref: "#/components/schemas/User",
            },
            session: {
              type: "object",
              properties: {
                access_token: { type: "string" },
                refresh_token: { type: "string" },
                expires_at: { type: "integer" },
              },
            },
          },
        },

        // ===== Error Schemas =====
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
            details: {
              type: "string",
              description: "Additional error details",
            },
          },
        },

        ValidationError: {
          type: "object",
          properties: {
            error: {
              type: "string",
            },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./app/api/**/*.ts", "./app/api/**/*.tsx"],
};

/**
 * Generate OpenAPI specification
 */
export const generateOpenApiSpec = () => {
  return swaggerJsdoc(options);
};

/**
 * Get OpenAPI specification as JSON
 */
export const getOpenApiJson = () => {
  return JSON.stringify(generateOpenApiSpec(), null, 2);
};

export default options;
