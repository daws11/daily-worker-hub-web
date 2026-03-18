/**
 * Booking Validation Schemas
 * 
 * Zod schemas for booking creation, check-in, and check-out operations
 */

import { z } from 'zod'

/**
 * Booking status enum
 */
export const bookingStatusEnum = z.enum(
  ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
  {
    errorMap: () => ({ message: 'Status booking tidak valid' }),
  }
)

/**
 * Booking creation schema
 */
export const createBookingSchema = z.object({
  job_id: z
    .string()
    .min(1, 'Job ID wajib diisi')
    .uuid('Job ID tidak valid'),
  
  worker_id: z
    .string()
    .min(1, 'Worker ID wajib diisi')
    .uuid('Worker ID tidak valid'),
  
  business_id: z
    .string()
    .min(1, 'Business ID wajib diisi')
    .uuid('Business ID tidak valid'),
  
  scheduled_date: z
    .string()
    .min(1, 'Tanggal jadwal wajib diisi')
    .datetime('Format tanggal tidak valid')
    .refine(
      (date) => {
        const scheduledDate = new Date(date)
        const now = new Date()
        // Allow bookings at least 1 hour in advance
        const minAdvance = new Date(now.getTime() + 60 * 60 * 1000)
        return scheduledDate >= minAdvance
      },
      { message: 'Jadwal harus minimal 1 jam dari sekarang' }
    ),
  
  scheduled_end_time: z
    .string()
    .datetime('Format tanggal tidak valid')
    .optional(),
  
  hourly_rate: z
    .number({
      invalid_type_error: 'Rate per jam harus berupa angka',
    })
    .min(10000, 'Rate per jam minimal Rp 10.000')
    .max(1000000, 'Rate per jam maksimal Rp 1.000.000'),
  
  hours_worked: z
    .number({
      invalid_type_error: 'Jam kerja harus berupa angka',
    })
    .min(1, 'Jam kerja minimal 1 jam')
    .max(24, 'Jam kerja maksimal 24 jam')
    .optional(),
  
  notes: z
    .string()
    .max(1000, 'Catatan maksimal 1000 karakter')
    .optional()
    .or(z.literal('')),
  
  special_instructions: z
    .string()
    .max(500, 'Instruksi khusus maksimal 500 karakter')
    .optional()
    .or(z.literal('')),
})
.refine(
  (data) => {
    // If scheduled_end_time is provided, validate it's after scheduled_date
    if (data.scheduled_end_time) {
      const start = new Date(data.scheduled_date)
      const end = new Date(data.scheduled_end_time)
      return end > start
    }
    return true
  },
  {
    message: 'Waktu selesai harus lebih dari waktu mulai',
    path: ['scheduled_end_time'],
  }
)

export type CreateBookingInput = z.infer<typeof createBookingSchema>

/**
 * Booking update schema
 */
export const updateBookingSchema = createBookingSchema
  .omit({ job_id: true, worker_id: true, business_id: true })
  .partial()
  .extend({
    status: bookingStatusEnum.optional(),
  })
  .refine(
    (data) => {
      if (data.scheduled_date && data.scheduled_end_time) {
        const start = new Date(data.scheduled_date)
        const end = new Date(data.scheduled_end_time)
        return end > start
      }
      return true
    },
    {
      message: 'Waktu selesai harus lebih dari waktu mulai',
      path: ['scheduled_end_time'],
    }
  )

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>

/**
 * Check-in schema
 */
export const checkInSchema = z.object({
  booking_id: z
    .string()
    .min(1, 'Booking ID wajib diisi')
    .uuid('Booking ID tidak valid'),
  
  worker_id: z
    .string()
    .min(1, 'Worker ID wajib diisi')
    .uuid('Worker ID tidak valid'),
  
  check_in_time: z
    .string()
    .datetime('Format waktu tidak valid')
    .optional(),
  
  location_lat: z
    .number()
    .min(-90, 'Latitude tidak valid')
    .max(90, 'Latitude tidak valid')
    .optional(),
  
  location_lng: z
    .number()
    .min(-180, 'Longitude tidak valid')
    .max(180, 'Longitude tidak valid')
    .optional(),
  
  notes: z
    .string()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional()
    .or(z.literal('')),
  
  photo_url: z
    .string()
    .url('URL foto tidak valid')
    .optional(),
})

export type CheckInInput = z.infer<typeof checkInSchema>

/**
 * Check-out schema
 */
export const checkOutSchema = z.object({
  booking_id: z
    .string()
    .min(1, 'Booking ID wajib diisi')
    .uuid('Booking ID tidak valid'),
  
  worker_id: z
    .string()
    .min(1, 'Worker ID wajib diisi')
    .uuid('Worker ID tidak valid'),
  
  check_out_time: z
    .string()
    .datetime('Format waktu tidak valid')
    .optional(),
  
  hours_worked: z
    .number({
      invalid_type_error: 'Jam kerja harus berupa angka',
    })
    .min(0.5, 'Jam kerja minimal 0.5 jam')
    .max(24, 'Jam kerja maksimal 24 jam')
    .refine(
      (val) => Number.isInteger(val * 2),
      { message: 'Jam kerja harus kelipatan 0.5 jam' }
    )
    .optional(),
  
  location_lat: z
    .number()
    .min(-90, 'Latitude tidak valid')
    .max(90, 'Latitude tidak valid')
    .optional(),
  
  location_lng: z
    .number()
    .min(-180, 'Longitude tidak valid')
    .max(180, 'Longitude tidak valid')
    .optional(),
  
  notes: z
    .string()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional()
    .or(z.literal('')),
  
  photo_url: z
    .string()
    .url('URL foto tidak valid')
    .optional(),
  
  completion_notes: z
    .string()
    .max(1000, 'Catatan penyelesaian maksimal 1000 karakter')
    .optional()
    .or(z.literal('')),
})

export type CheckOutInput = z.infer<typeof checkOutSchema>

/**
 * Booking cancellation schema
 */
export const cancelBookingSchema = z.object({
  booking_id: z
    .string()
    .min(1, 'Booking ID wajib diisi')
    .uuid('Booking ID tidak valid'),
  
  reason: z
    .string()
    .min(1, 'Alasan pembatalan wajib diisi')
    .min(10, 'Alasan minimal 10 karakter')
    .max(500, 'Alasan maksimal 500 karakter'),
  
  cancelled_by: z
    .enum(['worker', 'business', 'system'], {
      errorMap: () => ({ message: 'Pembatal tidak valid' }),
    }),
})

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>

/**
 * Booking search/filter schema
 */
export const bookingSearchSchema = z.object({
  search: z
    .string()
    .max(100, 'Pencarian maksimal 100 karakter')
    .optional(),
  
  worker_id: z
    .string()
    .uuid('Worker ID tidak valid')
    .optional(),
  
  business_id: z
    .string()
    .uuid('Business ID tidak valid')
    .optional(),
  
  job_id: z
    .string()
    .uuid('Job ID tidak valid')
    .optional(),
  
  status: bookingStatusEnum.optional(),
  
  date_from: z
    .string()
    .datetime('Format tanggal tidak valid')
    .optional(),
  
  date_to: z
    .string()
    .datetime('Format tanggal tidak valid')
    .optional(),
  
  sort: z
    .enum(['newest', 'oldest', 'date_asc', 'date_desc'], {
      errorMap: () => ({ message: 'Sort tidak valid' }),
    })
    .optional(),
  
  page: z
    .string()
    .regex(/^\d+$/, 'Halaman harus berupa angka')
    .optional(),
  
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .refine(
      (val) => {
        const num = parseInt(val)
        return num >= 1 && num <= 100
      },
      { message: 'Limit harus antara 1-100' }
    )
    .optional(),
})

export type BookingSearchInput = z.infer<typeof bookingSearchSchema>

/**
 * Complete booking schema
 */
export const completeBookingSchema = z.object({
  booking_id: z
    .string()
    .min(1, 'Booking ID wajib diisi')
    .uuid('Booking ID tidak valid'),
  
  actual_hours_worked: z
    .number({
      invalid_type_error: 'Jam kerja aktual harus berupa angka',
    })
    .min(0.5, 'Jam kerja minimal 0.5 jam')
    .max(24, 'Jam kerja maksimal 24 jam')
    .refine(
      (val) => Number.isInteger(val * 2),
      { message: 'Jam kerja harus kelipatan 0.5 jam' }
    ),
  
  completion_notes: z
    .string()
    .max(1000, 'Catatan penyelesaian maksimal 1000 karakter')
    .optional()
    .or(z.literal('')),
  
  total_amount: z
    .number({
      invalid_type_error: 'Total amount harus berupa angka',
    })
    .min(0, 'Total amount tidak boleh negatif')
    .optional(),
})

export type CompleteBookingInput = z.infer<typeof completeBookingSchema>
