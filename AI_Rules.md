# AI Rules - Coding Standards & Workflow
**Project:** Daily Worker Hub - Web MVP
**Platform:** Next.js + Supabase
**Version:** 1.0
**Last Updated:** February 21, 2026

---

## 1. Core Principles

### 1.1 Development Philosophy

| Principle | Description |
|-----------|-------------|
| **Clean Code** | Write self-documenting code. If you need a comment, consider rewriting. |
| **Type Safety** | Leverage TypeScript's type system. No `any` types without explicit reason. |
| **Component-First** | Build reusable UI components. Don't repeat yourself (DRY). |
| **Performance-First** | Optimize for Core Web Vitals. Lazy load, code split, cache strategically. |
| **Security-First** | Never trust user input. Validate everything. Use RLS policies. |
| **User Experience** | Every interaction should feel instant. Optimistic updates where appropriate. |

### 1.2 Code Quality Standards

| Metric | Target | Tool |
|--------|--------|------|
| TypeScript Coverage | > 95% (no `any` unless explicitly documented) | tsc |
| Code Formatting | Prettier enforced (2 spaces, single quotes) | prettier |
| Linting | ESLint + TypeScript ESLint (zero warnings) | eslint |
| Component Size | < 300 lines per component (split if larger) | Manual review |
| Function Length | < 50 lines per function (split if larger) | Manual review |

---

## 2. Naming Conventions

### 2.1 Files & Folders

| Type | Convention | Examples |
|------|-------------|----------|
| **Folders** | kebab-case | `components/ui/`, `lib/api/`, `app/(dashboard)/business/` |
| **Component Files** | PascalCase for components, kebab-case for utilities | `Button.tsx`, `use-auth.ts`, `format-date.ts` |
| **Test Files** | `*.test.tsx`, `*.spec.ts` | `Button.test.tsx`, `utils.spec.ts` |
| **Type Files** | PascalCase | `Database.ts`, `API.ts`, `Supabase.ts` |

### 2.2 TypeScript

| Type | Convention | Examples |
|------|-------------|----------|
| **Interfaces** | PascalCase, descriptive | `UserProfile`, `JobFormData`, `BookingResponse` |
| **Types** | PascalCase for complex, lowercase for primitive | `JobStatus`, `wallet_balance` |
| **Enums** | PascalCase, values in SCREAMING_SNAKE_CASE | `BookingStatus` → `PENDING`, `ACCEPTED`, `COMPLETED` |
| **Variables** | camelCase | `userName`, `jobTitle`, `isVerified` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_WAGE_RATE`, `MIN_WITHDRAWAL`, `API_BASE_URL` |
| **Booleans** | Prefix with `is`, `has`, `should`, `can` | `isLoading`, `hasPermission`, `shouldUpdate` |
| **Functions** | camelCase, verb-first | `getUserProfile()`, `createJob()`, `calculateReliabilityScore()` |

### 2.3 React & Next.js

| Type | Convention | Examples |
|------|-------------|----------|
| **Components** | PascalCase | `JobCard`, `WalletBalance`, `BookingForm` |
| **Hooks** | Prefix with `use` | `useAuth()`, `useWallet()`, `useNotifications()` |
| **Props** | Interface with `I` prefix or inline type | `interface ButtonProps { label: string }` |
| **Event Handlers** | Prefix with `on` | `onClick`, `onSubmit`, `onBookingAccept` |
| **Server Actions** | camelCase, verb-first | `createJob()`, `updateBooking()`, `processPayment()` |

### 2.4 Database (PostgreSQL + Supabase)

| Type | Convention | Examples |
|------|-------------|----------|
| **Table Names** | snake_case, plural | `profiles`, `business_profiles`, `bookings`, `wallets` |
| **Column Names** | snake_case | `user_id`, `job_id`, `created_at`, `updated_at` |
| **Primary Keys** | `id` (UUID) | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| **Foreign Keys** | `{table}_id` | `business_id`, `worker_id`, `job_id` |
| **Timestamps** | `created_at`, `updated_at` | `created_at TIMESTAMPTZ DEFAULT NOW()` |
| **Boolean Columns** | `is_` prefix | `is_verified`, `is_active`, `has_payment` |
| **Indexes** | `idx_{table}_{column}` | `idx_jobs_status_date`, `idx_bookings_worker_id` |

### 2.5 API Routes

| Type | Convention | Examples |
|------|-------------|----------|
| **API Routes** | kebab-case | `/api/webhooks/xendit`, `/api/jobs/[id]` |
| **Query Parameters** | kebab-case | `?status=open&date=2026-02-21` |
| **HTTP Methods** | UPPERCASE | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| **Response Status Codes** | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error |

---

## 3. Code Structure & Patterns

### 3.1 Component Structure

```typescript
// 1. Imports (grouped: external, internal, components, hooks, utils, types)
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/utils/format'
import type { UserProfile } from '@/lib/types/database'

// 2. Types (if not imported)
interface ComponentProps {
  userId: string
  onBookingAccept: (bookingId: string) => void
}

// 3. Component definition
export function BookingCard({ userId, onBookingAccept }: ComponentProps) {
  // 4. Hooks (grouped: state, effects, custom hooks, router)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // 5. Derived state
  const formattedWage = formatCurrency(booking.wage_rate)

  // 6. Event handlers
  const handleAccept = async () => {
    setIsLoading(true)
    try {
      await acceptBooking(booking.id)
      onBookingAccept(booking.id)
    } catch (error) {
      console.error('Failed to accept booking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 7. Effects (grouped by dependency)
  useEffect(() => {
    // Fetch booking details
  }, [booking.id])

  // 8. Conditional rendering
  if (isLoading) {
    return <LoadingSpinner />
  }

  // 9. Return JSX
  return (
    <Card>
      <CardContent>
        <h3>{booking.title}</h3>
        <p>{formattedWage}</p>
        <Button onClick={handleAccept}>Accept</Button>
      </CardContent>
    </Card>
  )
}
```

### 3.2 Server Action Structure

```typescript
// 1. Imports
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { jobFormSchema } from '@/lib/schemas/job'

// 2. Server client
export async function createJob(formData: FormData) {
  const supabase = await createClient()

  // 3. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 4. Validate input (Zod)
  const validatedFields = jobFormSchema.parse({
    title: formData.get('title'),
    position_type: formData.get('position_type'),
    date: formData.get('date'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    area: formData.get('area'),
    address: formData.get('address'),
    wage_rate: formData.get('wage_rate'),
    wage_type: formData.get('wage_type'),
    workers_needed: formData.get('workers_needed'),
  })

  // 5. Business logic
  const jobData = {
    business_id: user.id,
    ...validatedFields,
    status: 'open',
  }

  // 6. Database operation
  const { data, error } = await supabase
    .from('jobs')
    .insert(jobData)
    .select()
    .single()

  // 7. Error handling
  if (error) {
    console.error('Failed to create job:', error)
    return { error: 'Failed to create job' }
  }

  // 8. Cache invalidation
  revalidatePath('/business/jobs')
  revalidatePath('/marketplace/jobs')

  // 9. Return data or redirect
  return data
}
```

### 3.3 Custom Hook Structure

```typescript
// 1. Imports
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/database'

// 2. Hook parameters (if any)
interface UseAuthOptions {
  required?: boolean
}

// 3. Return type
interface UseAuthReturn {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// 4. Hook function
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  // 5. State
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 6. Side effects
  useEffect(() => {
    const initAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user as UserProfile)
      } else if (options.required) {
        // Redirect to login if auth is required
        window.location.href = '/login'
      }

      setIsLoading(false)
    }

    initAuth()

    // Cleanup
    return () => {
      // Unsubscribe if needed
    }
  }, [options.required])

  // 7. Memoized callbacks (prevent unnecessary re-renders)
  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  // 8. Return
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
  }
}
```

### 3.4 Schema Validation (Zod)

```typescript
// 1. Imports
import { z } from 'zod'

// 2. Schema definition (with clear error messages)
export const jobFormSchema = z.object({
  // Required fields
  title: z.string().min(5, 'Job title must be at least 5 characters').max(100),
  position_type: z.enum(['housekeeping', 'steward', 'cook', 'kitchen_helper', 'server', 'bartender', 'driver', 'other'], {
    required_error: 'Please select a position type',
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  area: z.enum(['badung', 'denpasar', 'gianyar', 'tabanan', 'other'], {
    required_error: 'Please select an area',
  }),
  address: z.string().min(10, 'Address must be at least 10 characters').max(500),
  wage_rate: z.number().int().min(50000, 'Wage rate must be at least IDR 50,000').max(500000),
  wage_type: z.enum(['flat', 'hourly'], {
    required_error: 'Please select wage type',
  }),
  workers_needed: z.number().int().min(1, 'At least 1 worker needed').max(50),

  // Optional fields
  description: z.string().max(1000).optional(),
  requirements: z.array(z.string()).optional(),

  // Nested objects
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
})

// 3. Type inference (extract TypeScript types from Zod schema)
export type JobFormData = z.infer<typeof jobFormSchema>

// 4. Default values
export const jobFormDefaultValues: Partial<JobFormData> = {
  wage_type: 'flat',
  workers_needed: 1,
  area: 'badung',
  requirements: [],
}
```

---

## 4. Error Handling Guidelines

### 4.1 Error Types

| Error Type | Handling Strategy | User Message |
|-----------|-------------------|---------------|
| **Validation Error** | Display field-specific error | "Job title must be at least 5 characters" |
| **Authentication Error** | Redirect to login, show toast | "Please sign in to continue" |
| **Authorization Error** | Show 403 or redirect to home | "You don't have permission to access this resource" |
| **Network Error** | Retry with exponential backoff | "Connection failed. Retrying..." |
| **Database Error** | Log to Sentry, show generic error | "Something went wrong. Please try again." |
| **Payment Error** | Show specific payment error | "Payment failed. Please try a different method." |
| **Not Found (404)** | Show 404 page or redirect | "Page not found" |

### 4.2 Error Handling Patterns

#### Try-Catch Wrapper

```typescript
// lib/utils/error-handler.ts
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'An error occurred'
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    console.error(errorMessage, error)
    
    // Send to Sentry (in production)
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error)
    }
    
    return { error: errorMessage }
  }
}

// Usage
const { data, error } = await withErrorHandling(
  () => createJob(formData),
  'Failed to create job'
)
```

#### React Error Boundaries

```typescript
// components/shared/error-boundary.tsx
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error, state: State) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-900 rounded-lg">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

#### Toast Notifications

```typescript
// components/shared/toaster.tsx
'use client'

import { toast } from '@/components/ui/use-toast'

export function showError(message: string) {
  toast({
    variant: 'destructive',
    title: 'Error',
    description: message,
  })
}

export function showSuccess(message: string) {
  toast({
    variant: 'default',
    title: 'Success',
    description: message,
  })
}

export function showInfo(message: string) {
  toast({
    variant: 'default',
    title: 'Info',
    description: message,
  })
}
```

### 4.3 Logging Best Practices

| Rule | Description | Example |
|------|-------------|---------|
| **Use appropriate log level** | `console.error` for errors, `console.warn` for warnings, `console.log` for debugging | `console.error('Failed to create job:', error)` |
| **Include context** | Always log relevant data (user ID, request ID) | `console.error('Failed to create job for user:', userId, error)` |
| **No sensitive data** | Never log passwords, tokens, PII | ❌ `console.log('Password:', password)` |
| **Structured logging** | Use objects for complex data | `console.log({ userId, jobId, error })` |
| **Production logs** | Use proper logging service (Sentry) in production | `Sentry.captureException(error)` |

---

## 5. Workflow & Task Management

### 5.1 MANDATORY: Update Plan.md After Each Task

**CRITICAL RULE:** Every time you complete a task, you MUST update `Plan.md` by:

1. ✅ Checking the checkbox for the completed task
2. 📝 Adding a brief completion note (what was done, any challenges)
3. 🔄 Moving to the next task if applicable
4. 📊 Updating the overall progress percentage if applicable

**Example Entry in Plan.md:**

```markdown
| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|------------------|----------|
| TASK-001 | Create job posting form with validation | ✅ Completed | Built form with 7 fields, Zod validation, server action integration. Fixed date picker issue. | 2026-02-21 |
```

### 5.2 Task Completion Checklist

Before marking a task as complete, ensure:

- [ ] Code is formatted (Prettier)
- [ ] No linting errors (ESLint)
- [ ] No TypeScript errors (no `any` without reason)
- [ ] Component/page renders without console errors
- [ ] Responsive on mobile (320px+) and desktop (1920px+)
- [ ] Accessibility checked (keyboard navigation, ARIA labels)
- [ ] Error handling implemented for user actions
- [ ] Loading states displayed for async operations
- [ ] `Plan.md` updated with completion note

### 5.3 Git Workflow

```bash
# 1. Create feature branch (from main)
git checkout -b feature/job-posting-form

# 2. Make changes
git add .
git commit -m "feat(job-posting): implement job form with validation"

# 3. Push to remote
git push origin feature/job-posting-form

# 4. Create pull request (through GitHub UI)

# 5. After merge, delete branch
git checkout main
git pull origin main
git branch -D feature/job-posting-form
```

### 5.4 Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description | Examples |
|------|-------------|----------|
| `feat` | New feature | `feat(job-posting): add job form validation` |
| `fix` | Bug fix | `fix(wallet): resolve balance calculation error` |
| `refactor` | Code improvement without feature change | `refactor(auth): simplify user session logic` |
| `style` | Code style changes (formatting, missing semicolons) | `style(components): format with Prettier` |
| `docs` | Documentation changes | `docs(readme): update architecture section` |
| `test` | Adding or updating tests | `test(job-form): add unit tests for validation` |
| `chore` | Maintenance tasks, updates to build process | `chore(deps): update dependencies` |

---

## 6. Performance Guidelines

### 6.1 React Performance

| Rule | Description | Example |
|------|-------------|---------|
| **Memoize expensive calculations** | Use `useMemo` for computed values | `const formattedWage = useMemo(() => formatCurrency(wage), [wage])` |
| **Memoize callbacks** | Use `useCallback` for event handlers | `const handleSubmit = useCallback(async () => { ... }, [onSubmit])` |
| **Code splitting** | Dynamic imports for heavy components | `const BookingForm = dynamic(() => import('./BookingForm'))` |
| **Lazy loading** | Use `React.lazy` for route components | `const Dashboard = lazy(() => import('./Dashboard'))` |
| **Avoid re-renders** | Optimize dependencies in hooks | `useEffect(() => { ... }, [dependency1, dependency2])` |

### 6.2 Image & Asset Optimization

| Rule | Description | Implementation |
|------|-------------|----------------|
| **Use Next.js Image** | Automatic optimization, lazy loading, responsive images | `<Image src={avatarUrl} alt={name} width={100} height={100} />` |
| **WebP format** | Use WebP for better compression | Export images as WebP (20-30% smaller than JPEG) |
| **Compress images** | Use TinyPNG or Squoosh before adding to repository | Target: < 100KB for avatars, < 500KB for banners |
| **Lazy load below fold** | Use `loading="lazy"` for off-screen images | `<img loading="lazy" src={...} />` |

### 6.3 Database Query Optimization

| Rule | Description | Example |
|------|-------------|---------|
| **Select only needed columns** | Don't use `SELECT *` | `.select('id, title, status')` |
| **Use indexes** | Ensure queried columns are indexed | `CREATE INDEX idx_jobs_status ON jobs(status)` |
| **Limit results** | Use pagination for large datasets | `.range(0, 20)` |
| **Use real-time subscriptions wisely** | Don't subscribe to entire table | `.eq('worker_id', userId)` |

---

## 7. Security Guidelines

### 7.1 Input Validation

```typescript
// ALWAYS validate user input with Zod
import { z } from 'zod'

const safeInput = z.object({
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\d{10,13}$/, 'Phone number must be 10-13 digits'),
})

// Never trust raw input
const email = safeInput.parse(rawInput.email)
```

### 7.2 SQL Injection Prevention

```sql
-- ✅ CORRECT: Use parameterized queries (Supabase handles this)
-- Supabase automatically parameterizes queries
-- No manual SQL string concatenation!

-- ❌ WRONG: Manual SQL concatenation (vulnerable)
-- Never do this!
```

### 7.3 XSS Prevention

```typescript
// ✅ CORRECT: Sanitize HTML before rendering
// Next.js auto-escapes in JSX by default
<p>{userProvidedContent}</p> // Safe

// ❌ WRONG: Rendering raw HTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userProvidedHTML }} /> // Only use if necessary and sanitize first
```

### 7.4 RLS (Row Level Security)

```sql
-- ALWAYS enable RLS for user data
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies to ensure users can only access their own data
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

---

## 8. Testing Guidelines

### 8.1 Unit Testing

```typescript
// Use Jest + React Testing Library
import { render, screen, fireEvent } from '@testing-library/react'
import { JobForm } from './JobForm'

describe('JobForm', () => {
  it('should render job title input', () => {
    render(<JobForm />)
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument()
  })

  it('should submit form with valid data', async () => {
    const handleSubmit = jest.fn()
    render(<JobForm onSubmit={handleSubmit} />)

    fireEvent.change(screen.getByLabelText(/job title/i), {
      target: { value: 'Housekeeper needed' }
    })

    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Housekeeper needed'
      }))
    })
  })
})
```

### 8.2 Integration Testing

```typescript
// Test database operations
import { createClient } from '@/lib/supabase/server'

describe('Job Creation', () => {
  it('should create job in database', async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        title: 'Test Job',
        position_type: 'housekeeping',
        date: '2026-02-21',
        start_time: '09:00',
        end_time: '17:00',
        area: 'badung',
        address: 'Test Address',
        wage_rate: 150000,
        wage_type: 'flat',
        workers_needed: 1,
        status: 'open',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toHaveProperty('id')
    expect(data?.title).toBe('Test Job')
  })
})
```

---

## 9. Documentation Guidelines

### 9.1 Code Comments

| Rule | Example |
|------|---------|
| **No comments for obvious code** | ❌ `// Add 1 + 1` <br>✅ `const sum = 1 + 1` |
| **Explain WHY, not WHAT** | ❌ `// Set loading to true` <br>✅ `// Prevent duplicate submissions` |
| **Keep comments up-to-date** | Remove obsolete comments, update when code changes |
| **Use TODO/FIXME** | `// TODO: Implement pagination` <br>`// FIXME: Handle edge case for zero results` |

### 9.2 README.md Updates

When adding new features or components, update README.md with:

- **Component Name**: Brief description
- **Props Interface**: List of props with types
- **Usage Example**: Code snippet showing how to use it
- **Dependencies**: What it depends on

```markdown
## JobCard

Displays job information in a card format.

### Props
| Prop | Type | Required | Description |
|------|------|-----------|-------------|
| `job` | `Job` | Yes | Job object to display |
| `onApply` | `(jobId: string) => void` | Yes | Callback when apply button clicked |

### Usage
```tsx
import { JobCard } from '@/components/business/job-card'

<JobCard job={job} onApply={(jobId) => handleApply(jobId)} />
```
```

---

## 10. AI-Specific Rules

### 10.1 Before Starting Tasks

1. **Read Plan.md first** - Always check `Plan.md` before starting work
2. **Read relevant files** - Read existing components, hooks, or schemas before creating new ones
3. **Check for duplicates** - Search for existing implementations before building from scratch
4. **Understand the context** - Read PRD.md and Architecture.md if unsure about requirements or architecture

### 10.2 During Development

1. **Write clean code** - Follow the conventions in this document
2. **Use existing components** - Check shadcn/ui library first before creating new components
3. **Optimize as you go** - Don't wait until the end to optimize
4. **Test as you code** - Run the app frequently to catch issues early
5. **Document important decisions** - Add comments for non-obvious decisions

### 10.3 After Completing Tasks

1. **MUST update Plan.md** - Check off the completed task, add completion note
2. **Test thoroughly** - Manual test the feature across different screen sizes
3. **Check for console errors** - Ensure no errors in browser console
4. **Commit changes** - Follow commit message conventions
5. **Notify the user** - Briefly explain what was done and any next steps

### 10.4 Error Handling

If you encounter an error:

1. **Read the error message** - Understand what went wrong
2. **Check the logs** - Look for additional context in console or server logs
3. **Search for solutions** - Look for similar issues in documentation or online
4. **Ask for clarification** - If unsure, explain the error and what you've tried
5. **Document the solution** - Once resolved, add a note to prevent future issues

---

## 11. Continuous Improvement

This document is a living document. As we learn and grow:

- **Add new rules** based on experience and best practices
- **Update existing rules** if they're not working well
- **Remove obsolete rules** to keep the document concise
- **Share knowledge** through code reviews and team discussions

---

**Document Owner:** Sasha (AI Co-founder)
**Last Review:** February 21, 2026
**Next Review:** After 1 month of development
