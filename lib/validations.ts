import { z } from "zod";

import { isValidDomain, normalizeDomain } from "@/lib/utils";

const trimmed = z.string().trim();

export const signInSchema = z.object({
  email: trimmed.email("Enter a valid email address").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const signUpSchema = signInSchema.extend({
  name: trimmed
    .min(2, "Name must be at least 2 characters")
    .max(64, "Name is too long"),
});

export const createSiteSchema = z.object({
  name: trimmed
    .min(2, "Name must be at least 2 characters")
    .max(64, "Name is too long"),
  domain: trimmed
    .min(3, "Domain is too short")
    .max(253, "Domain is too long")
    .transform(normalizeDomain)
    .refine(isValidDomain, "Enter a valid domain, e.g. acme.com"),
  environment: z
    .enum(["production", "staging", "development"])
    .default("production"),
});

export const updateSiteSchema = z
  .object({
    name: trimmed.min(2).max(64).optional(),
    domain: trimmed
      .min(3)
      .max(253)
      .transform(normalizeDomain)
      .refine(isValidDomain, "Enter a valid domain, e.g. acme.com")
      .optional(),
    environment: z
      .enum(["production", "staging", "development"])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const RANGES = ["24h", "7d", "30d", "90d"] as const;
export type Range = (typeof RANGES)[number];

export const statsQuerySchema = z.object({
  site: trimmed.optional(),
  range: z.enum(RANGES).default("7d"),
});

/**
 * The tracking payload is untrusted input from arbitrary origins, so every
 * field is clamped hard. `z.coerce.number()` handles the string form that
 * arrives via the query-string beacon.
 */
export const collectSchema = z.object({
  site: trimmed.min(4).max(64),
  type: z.enum(["pageview", "engagement", "event"]).default("pageview"),
  path: trimmed.max(1024).default("/"),
  title: trimmed.max(256).optional(),
  ref: trimmed.max(1024).optional(),
  vid: trimmed.min(4).max(64).optional(),
  sid: trimmed.max(64).optional(),
  br: trimmed.max(48).optional(),
  os: trimmed.max(48).optional(),
  dv: trimmed.max(24).optional(),
  w: z.coerce.number().int().min(0).max(20000).optional(),
  h: z.coerce.number().int().min(0).max(20000).optional(),
  lang: trimmed.max(16).optional(),
  dur: z.coerce.number().int().min(0).max(86400).optional(),
  scroll: z.coerce.number().int().min(0).max(100).optional(),
  name: trimmed.max(64).optional(),
});

export type CollectInput = z.infer<typeof collectSchema>;

/** Flatten a ZodError into `{ field: message }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
