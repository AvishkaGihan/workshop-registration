import { z } from "zod";
import { LOCATIONS, ROLES, WORKSHOP_STATUSES } from "./constants";

const text = (what: string, max = 100) =>
  z
    .string({ error: `Please enter ${what}.` })
    .trim()
    .min(1, `Please enter ${what}.`)
    .max(max, `That's a bit long. Please keep it under ${max} characters.`);

const email = z
  .string({ error: "Please enter an email address." })
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.");

/* ---------- Auth and users ---------- */

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "Please enter your password." })
    .min(1, "Please enter your password."),
});

export const createUserSchema = z.object({
  name: text("a name"),
  email,
  password: z
    .string({ error: "Please enter a temporary password." })
    .min(8, "The temporary password needs at least 8 characters.")
    .max(100, "That password is too long."),
  role: z.enum(ROLES, {
    error: "Please choose a role.",
  }),
});

export const updateUserSchema = z
  .object({
    role: z
      .enum(ROLES, {
        error: "Please choose a valid role.",
      })
      .optional(),
    isActive: z
      .boolean({ error: "isActive must be true or false." })
      .optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, {
    message: "There is nothing to change.",
  });

/* ---------- Workshops ---------- */

const workshopFields = z.object({
  code: text("a workshop code, like POT-101", 20).transform((s) =>
    s.toUpperCase(),
  ),
  title: text("a title", 120),
  instructor: text("the instructor's name"),
  startsAt: z
    .string({ error: "Please choose a date and time." })
    .datetime({ offset: true, error: "Please choose a valid date and time." })
    .transform((s) => new Date(s)),
  durationMinutes: z
    .number({ error: "Duration must be a number of minutes." })
    .int("Duration must be a whole number of minutes.")
    .min(15, "Workshops need to be at least 15 minutes long.")
    .max(720, "Workshops can be at most 12 hours long.")
    .default(60),
  location: z.enum(LOCATIONS, {
    error: "Please choose a location.",
  }),
  description: z
    .string()
    .trim()
    .max(2000, "Please keep the description under 2000 characters.")
    .default(""),
  capacity: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? "Please enter a capacity."
          : "Capacity must be a number.",
    })
    .int("Capacity must be a whole number.")
    .min(0, "Capacity can't be negative.")
    .max(500, "Capacity can be at most 500."),
  status: z
    .enum(WORKSHOP_STATUSES, {
      error: "Please choose a status.",
    })
    .default("draft"),
});

export const createWorkshopSchema = workshopFields;

export const updateWorkshopSchema = workshopFields
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "There is nothing to change.",
  });

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dates need to look like 2026-10-31.");

export const workshopQuerySchema = z.object({
  from: day.optional(),
  to: day.optional(),
  status: z
    .enum(WORKSHOP_STATUSES, {
      error: "That status isn't recognised.",
    })
    .optional(),
  hasSeats: z
    .enum(["true", "1"], {
      error: "hasSeats must be true.",
    })
    .optional()
    .transform((v) => v !== undefined),
});

/* ---------- Registrations ---------- */

export const registerSchema = z.object({
  attendeeName: text("the attendee's name"),
  attendeeEmail: email,
});

export const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(300, "Please keep the reason under 300 characters.")
    .optional(),
});

/* ---------- Types ---------- */

export type CreateWorkshopInput = z.output<typeof createWorkshopSchema>;
export type UpdateWorkshopInput = z.output<typeof updateWorkshopSchema>;
export type WorkshopFilters = z.output<typeof workshopQuerySchema>;

/** For server pages: read filters from the URL, quietly ignoring anything invalid. */
export function parseWorkshopFilters(
  searchParams: Record<string, string | string[] | undefined>,
): WorkshopFilters {
  const flat = Object.fromEntries(
    Object.entries(searchParams)
      .map(([k, v]): [string, string | undefined] => [
        k,
        Array.isArray(v) ? v[0] : v,
      ])
      .filter(([, v]) => v),
  );
  const parsed = workshopQuerySchema.safeParse(flat);
  return parsed.success ? parsed.data : { hasSeats: false };
}
