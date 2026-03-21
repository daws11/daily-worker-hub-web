/**
 * Job Validation Schemas
 *
 * Zod schemas for job creation and update operations
 */

import { z } from "zod";

/**
 * Job status enum
 */
export const jobStatusEnum = z.enum(
  ["draft", "open", "in_progress", "completed", "cancelled"],
  {
    message: "Status job tidak valid",
  },
);

/**
 * Job creation schema
 */
export const createJobSchema = z
  .object({
    business_id: z
      .string()
      .min(1, "Business ID wajib diisi")
      .uuid("Business ID tidak valid"),

    category_id: z
      .string()
      .min(1, "Kategori wajib dipilih")
      .uuid("Category ID tidak valid"),

    title: z
      .string()
      .min(1, "Judul job wajib diisi")
      .min(5, "Judul job minimal 5 karakter")
      .max(200, "Judul job maksimal 200 karakter"),

    description: z
      .string()
      .min(1, "Deskripsi wajib diisi")
      .min(20, "Deskripsi minimal 20 karakter")
      .max(5000, "Deskripsi maksimal 5000 karakter"),

    requirements: z
      .string()
      .max(3000, "Persyaratan maksimal 3000 karakter")
      .optional()
      .or(z.literal("")),

    budget_min: z
      .number({
        message: "Budget minimum harus berupa angka",
      })
      .min(10000, "Budget minimum minimal Rp 10.000")
      .max(100000000, "Budget maksimal Rp 100.000.000"),

    budget_max: z
      .number({
        message: "Budget maksimum harus berupa angka",
      })
      .min(10000, "Budget maksimum minimal Rp 10.000")
      .max(100000000, "Budget maksimal Rp 100.000.000"),

    hours_needed: z
      .number({
        message: "Jam kerja harus berupa angka",
      })
      .min(1, "Jam kerja minimal 1 jam")
      .max(24, "Jam kerja maksimal 24 jam per hari")
      .refine((val) => Number.isInteger(val) || val % 0.5 === 0, {
        message: "Jam kerja harus kelipatan 0.5 jam",
      }),

    address: z
      .string()
      .min(1, "Alamat wajib diisi")
      .min(10, "Alamat minimal 10 karakter")
      .max(500, "Alamat maksimal 500 karakter"),

    lat: z
      .number()
      .min(-90, "Latitude tidak valid")
      .max(90, "Latitude tidak valid")
      .optional(),

    lng: z
      .number()
      .min(-180, "Longitude tidak valid")
      .max(180, "Longitude tidak valid")
      .optional(),

    deadline: z
      .string()
      .datetime("Format deadline tidak valid")
      .refine(
        (date) => {
          const deadlineDate = new Date(date);
          const now = new Date();
          return deadlineDate > now;
        },
        { message: "Deadline harus lebih dari waktu sekarang" },
      )
      .optional()
      .nullable(),

    is_urgent: z.boolean().optional(),

    overtime_multiplier: z
      .number({
        message: "Overtime multiplier harus berupa angka",
      })
      .min(1, "Overtime multiplier minimal 1.0")
      .max(3, "Overtime multiplier maksimal 3.0")
      .optional(),

    workers_needed: z
      .number({
        message: "Jumlah worker harus berupa angka",
      })
      .int("Jumlah worker harus berupa angka bulat")
      .min(1, "Minimal 1 worker")
      .max(100, "Maksimal 100 worker")
      .optional(),

    skills_required: z
      .array(z.string().uuid("Skill ID tidak valid"))
      .min(1, "Pilih minimal 1 skill")
      .max(20, "Maksimal 20 skill")
      .optional(),
  })
  .refine((data) => data.budget_max >= data.budget_min, {
    message:
      "Budget maksimum harus lebih besar atau sama dengan budget minimum",
    path: ["budget_max"],
  });

/**
 * Base job schema (without refinements - for extension)
 */
const baseJobSchema = z
  .object({
    business_id: z
      .string()
      .min(1, "Business ID wajib diisi")
      .uuid("Business ID tidak valid"),

    category_id: z
      .string()
      .min(1, "Kategori wajib dipilih")
      .uuid("Category ID tidak valid"),

    title: z
      .string()
      .min(1, "Judul job wajib diisi")
      .min(5, "Judul job minimal 5 karakter")
      .max(200, "Judul job maksimal 200 karakter"),

    description: z
      .string()
      .min(1, "Deskripsi wajib diisi")
      .min(20, "Deskripsi minimal 20 karakter")
      .max(5000, "Deskripsi maksimal 5000 karakter"),

    requirements: z
      .string()
      .max(3000, "Persyaratan maksimal 3000 karakter")
      .optional()
      .or(z.literal("")),

    budget_min: z
      .number({
        message: "Budget minimum harus berupa angka",
      })
      .min(10000, "Budget minimum minimal Rp 10.000")
      .max(100000000, "Budget maksimal Rp 100.000.000"),

    budget_max: z
      .number({
        message: "Budget maksimum harus berupa angka",
      })
      .min(10000, "Budget maksimum minimal Rp 10.000")
      .max(100000000, "Budget maksimal Rp 100.000.000"),

    hours_needed: z
      .number({
        message: "Jam kerja harus berupa angka",
      })
      .min(1, "Jam kerja minimal 1 jam")
      .max(24, "Jam kerja maksimal 24 jam per hari")
      .refine((val) => Number.isInteger(val) || val % 0.5 === 0, {
        message: "Jam kerja harus kelipatan 0.5 jam",
      }),

    address: z
      .string()
      .min(1, "Alamat wajib diisi")
      .min(10, "Alamat minimal 10 karakter")
      .max(500, "Alamat maksimal 500 karakter"),

    lat: z
      .number()
      .min(-90, "Latitude tidak valid")
      .max(90, "Latitude tidak valid")
      .optional(),

    lng: z
      .number()
      .min(-180, "Longitude tidak valid")
      .max(180, "Longitude tidak valid")
      .optional(),

    deadline: z
      .string()
      .datetime("Format deadline tidak valid")
      .refine(
        (date) => {
          const deadlineDate = new Date(date);
          const now = new Date();
          return deadlineDate > now;
        },
        { message: "Deadline harus lebih dari waktu sekarang" },
      )
      .optional()
      .nullable(),

    is_urgent: z.boolean().optional(),

    overtime_multiplier: z
      .number({
        message: "Overtime multiplier harus berupa angka",
      })
      .min(1, "Overtime multiplier minimal 1.0")
      .max(3, "Overtime multiplier maksimal 3.0")
      .optional(),

    workers_needed: z
      .number({
        message: "Jumlah worker harus berupa angka",
      })
      .int("Jumlah worker harus berupa angka bulat")
      .min(1, "Minimal 1 worker")
      .max(100, "Maksimal 100 worker")
      .optional(),

    skills_required: z
      .array(z.string().uuid("Skill ID tidak valid"))
      .min(1, "Pilih minimal 1 skill")
      .max(20, "Maksimal 20 skill")
      .optional(),
  });

export type CreateJobInput = z.infer<typeof createJobSchema>;

/**
 * Job update schema (partial)
 */
export const updateJobSchema = baseJobSchema
  .omit({ business_id: true }) // Cannot change business_id
  .partial()
  .extend({
    status: jobStatusEnum.optional(),
  });

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

/**
 * Job search/filter schema
 */
export const jobSearchSchema = z.object({
  search: z.string().max(100, "Pencarian maksimal 100 karakter").optional(),

  category_id: z.string().uuid("Category ID tidak valid").optional(),

  business_id: z.string().uuid("Business ID tidak valid").optional(),

  status: jobStatusEnum.optional(),

  is_urgent: z
    .string()
    .transform((val) => val === "true")
    .optional(),

  wage_min: z
    .string()
    .regex(/^\d+$/, "Budget minimum harus berupa angka")
    .optional(),

  wage_max: z
    .string()
    .regex(/^\d+$/, "Budget maksimum harus berupa angka")
    .optional(),

  hours_min: z
    .string()
    .regex(/^\d+(\.5)?$/, "Jam minimum harus berupa angka")
    .optional(),

  hours_max: z
    .string()
    .regex(/^\d+(\.5)?$/, "Jam maksimum harus berupa angka")
    .optional(),

  location: z.string().max(100, "Lokasi maksimal 100 karakter").optional(),

  lat: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, "Latitude tidak valid")
    .optional(),

  lng: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, "Longitude tidak valid")
    .optional(),

  radius: z.string().regex(/^\d+$/, "Radius harus berupa angka").optional(),

  deadline_from: z.string().datetime("Format tanggal tidak valid").optional(),

  deadline_to: z.string().datetime("Format tanggal tidak valid").optional(),

  sort: z
    .enum(["newest", "oldest", "highest_wage", "lowest_wage", "deadline"], {
      message: "Sort tidak valid",
    })
    .optional(),

  page: z.string().regex(/^\d+$/, "Halaman harus berupa angka").optional(),

  limit: z
    .string()
    .regex(/^\d+$/, "Limit harus berupa angka")
    .refine(
      (val) => {
        const num = parseInt(val);
        return num >= 1 && num <= 100;
      },
      { message: "Limit harus antara 1-100" },
    )
    .optional(),
});

export type JobSearchInput = z.infer<typeof jobSearchSchema>;

/**
 * Job application schema
 */
export const jobApplicationSchema = z.object({
  job_id: z.string().min(1, "Job ID wajib diisi").uuid("Job ID tidak valid"),

  worker_id: z
    .string()
    .min(1, "Worker ID wajib diisi")
    .uuid("Worker ID tidak valid"),

  message: z
    .string()
    .max(1000, "Pesan maksimal 1000 karakter")
    .optional()
    .or(z.literal("")),

  proposed_rate: z
    .number({
      message: "Rate yang diajukan harus berupa angka",
    })
    .min(10000, "Rate minimal Rp 10.000")
    .max(100000000, "Rate maksimal Rp 100.000.000")
    .optional(),

  availability_date: z
    .string()
    .datetime("Format tanggal tidak valid")
    .optional(),
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;

/**
 * Job application update schema
 */
export const updateApplicationSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "withdrawn"], {
    message: "Status aplikasi tidak valid",
  }),

  message: z
    .string()
    .max(1000, "Pesan maksimal 1000 karakter")
    .optional()
    .or(z.literal("")),
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
