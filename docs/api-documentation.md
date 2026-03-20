# API Documentation

This document describes how to use and extend the Daily Worker Hub API documentation.

## Overview

The Daily Worker Hub API is documented using OpenAPI 3.0.3 specification. The documentation is:

- **Interactive**: Available at `/docs` with Swagger UI
- **Machine-readable**: Available at `/api/docs` as JSON
- **Code-driven**: Generated from JSDoc comments in the API routes

## Accessing the Documentation

### Swagger UI (Interactive)

Visit `/docs` in your browser to access the interactive Swagger UI documentation.

```
Development: http://localhost:3000/docs
Staging: https://staging.dailyworkerhub.com/docs
Production: https://dailyworkerhub.com/docs
```

### OpenAPI JSON Specification

Fetch the raw OpenAPI specification at `/api/docs`:

```bash
curl http://localhost:3000/api/docs
```

This endpoint is useful for:

- Generating client SDKs
- Importing into API testing tools (Postman, Insomnia)
- CI/CD pipeline validation

## Authentication

Most API endpoints require authentication using Bearer tokens from Supabase Auth.

### Getting a Token

1. Register or login through the Supabase Auth client
2. Receive an access token in the response
3. Include the token in the Authorization header

### Using the Token

```bash
curl -X GET "https://api.dailyworkerhub.com/api/jobs" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### In Swagger UI

1. Click the "Authorize" button at the top of the page
2. Enter your token (without the "Bearer " prefix)
3. Click "Authorize"
4. All subsequent requests will include the token

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

| Endpoint Type           | Rate Limit          |
| ----------------------- | ------------------- |
| Public endpoints        | 30 requests/minute  |
| Authenticated endpoints | 100 requests/minute |
| Payment endpoints       | 10 requests/minute  |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1647887600
```

## Adding New Endpoints

### Step 1: Create the API Route

Create a new file in `app/api/` following Next.js App Router conventions:

```
app/api/my-endpoint/route.ts
```

### Step 2: Add JSDoc Comments

Add OpenAPI JSDoc comments to your route handlers:

```typescript
/**
 * @openapi
 * /api/my-endpoint:
 *   get:
 *     tags:
 *       - MyTag
 *     summary: Short description
 *     description: Longer description with details
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         description: The ID parameter
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  // Implementation
}
```

### Step 3: Reference Existing Schemas

Use existing schemas from `lib/openapi.ts` to maintain consistency:

```typescript
/**
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 */
```

Available schemas:

- `User` - User object
- `Worker` - Worker profile
- `WorkerPublic` - Public worker profile (safe data)
- `Business` - Business profile
- `Job` - Job posting
- `JobCreate` - Job creation request
- `JobUpdate` - Job update request
- `JobResponse` - Job API response
- `Booking` - Booking object
- `BookingCreate` - Booking creation request
- `BookingResponse` - Booking API response
- `PaymentTransaction` - Payment transaction
- `PaymentCreate` - Payment creation request
- `PaymentCreateResponse` - Payment API response
- `WithdrawRequest` - Withdrawal request
- `WithdrawResponse` - Withdrawal API response
- `Notification` - Notification object
- `NotificationListResponse` - Notification list response
- `LoginRequest` - Login request body
- `RegisterRequest` - Registration request body
- `AuthResponse` - Authentication response
- `Error` - Generic error response
- `ValidationError` - Validation error response

### Step 4: Add New Schemas (if needed)

If you need a new schema, add it to `lib/openapi.ts` in the `components.schemas` section:

```typescript
MyNewSchema: {
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier',
    },
    name: {
      type: 'string',
      description: 'Name of the item',
    },
  },
},
```

## JSDoc Annotations Reference

### Common Annotations

| Annotation    | Description                                |
| ------------- | ------------------------------------------ |
| `@openapi`    | Marks the comment as OpenAPI documentation |
| `tags`        | Groups endpoints in Swagger UI             |
| `summary`     | Short endpoint description                 |
| `description` | Detailed endpoint description              |
| `parameters`  | Query, path, or header parameters          |
| `requestBody` | Request body specification                 |
| `responses`   | Response specifications                    |
| `security`    | Authentication requirements                |
| `deprecated`  | Marks endpoint as deprecated               |

### Parameter Locations

- `query` - URL query parameters (`?param=value`)
- `path` - URL path parameters (`/users/{id}`)
- `header` - HTTP headers
- `cookie` - Cookie values

### Security

Mark endpoints as public:

```typescript
security: [];
```

Require authentication:

```typescript
security:
  - bearerAuth: []
```

## Testing Endpoints

### Using Swagger UI

1. Navigate to `/docs`
2. Find your endpoint
3. Click "Try it out"
4. Fill in parameters
5. Click "Execute"
6. View the response

### Using curl

```bash
# GET request
curl "http://localhost:3000/api/jobs?category_id=abc123"

# POST request with body
curl -X POST "http://localhost:3000/api/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title": "New Job", "description": "Description"}'
```

### Using JavaScript

```javascript
const response = await fetch("/api/jobs", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const data = await response.json();
```

## Best Practices

### 1. Consistent Naming

- Use camelCase for JSON properties
- Use kebab-case for URL paths
- Use PascalCase for schema names

### 2. Descriptive Messages

- Provide clear, actionable error messages
- Include validation details in error responses
- Use consistent message format

### 3. Versioning

Currently, the API is unversioned. When versioning is needed:

1. Create new routes: `/api/v2/jobs`
2. Update documentation to mark old endpoints as deprecated
3. Maintain backward compatibility

### 4. Examples

Add examples to schemas for clarity:

```typescript
MySchema: {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['active', 'inactive'],
      example: 'active',
    },
  },
},
```

## Troubleshooting

### Documentation Not Updating

1. Restart the development server
2. Clear browser cache
3. Check for JSDoc syntax errors

### Missing Endpoints

1. Ensure `@openapi` tag is present
2. Check the file path matches the pattern in `lib/openapi.ts`
3. Verify the API route is properly exported

### Authentication Issues

1. Verify token is valid and not expired
2. Check Authorization header format: `Bearer <token>`
3. Ensure user has required permissions

## Files Reference

| File                        | Purpose                           |
| --------------------------- | --------------------------------- |
| `lib/openapi.ts`            | OpenAPI configuration and schemas |
| `app/api/docs/route.ts`     | Serves OpenAPI JSON spec          |
| `app/docs/page.tsx`         | Swagger UI page                   |
| `docs/api-documentation.md` | This documentation file           |

## Support

For API support:

- Email: support@dailyworkerhub.com
- Documentation: https://dailyworkerhub.com/docs
- GitHub Issues: https://github.com/daws11/daily-worker-hub/issues
