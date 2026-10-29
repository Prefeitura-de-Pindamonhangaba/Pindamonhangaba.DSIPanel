import { z } from "zod";
export const glpiId = z.coerce.number().int().positive();
const nonnegativeId = z.coerce
  .number()
  .int()
  .nonnegative()
  .nullish()
  .transform((value) => value ?? 0);
const rawDate = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
const optionalDate = z
  .union([rawDate, z.literal("")])
  .nullish()
  .transform((value) => value || null);
export const ticketDetailSchema = z.object({
  id: glpiId,
  name: z.string(),
  status: z.coerce.number().int().min(1).max(6),
  priority: z.coerce.number().int().min(1).max(6),
  date: rawDate,
  date_mod: rawDate,
  solvedate: optionalDate,
  time_to_resolve: optionalDate,
  time_to_own: optionalDate,
  slas_id_ttr: nonnegativeId,
  slas_id_tto: nonnegativeId,
  is_deleted: z.coerce.number().int().min(0).max(1),
  _contracts: z.array(z.object({ contracts_id: glpiId })),
});
export const groupSchema = z.object({ id: glpiId, name: z.string() });
export const groupRelationSchema = z.object({
  groups_id: glpiId,
  tickets_id: glpiId,
  type: z.coerce.number().int(),
});
export const supplierRelationSchema = z.object({
  suppliers_id: glpiId,
  tickets_id: glpiId,
  type: z.coerce.number().int(),
});
export const supplierSchema = z.object({
  id: glpiId,
  name: z.string(),
  registration_number: z.string().nullish(),
  otherserial: z.string().nullish(),
});
export const glpiContractSchema = z.object({
  id: glpiId,
  name: z.string(),
  num: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
});
export const searchResponseSchema = z.object({
  totalcount: z.coerce.number().int().nonnegative(),
  data: z
    .union([
      z.array(z.record(z.string(), z.unknown())),
      z.record(z.string(), z.record(z.string(), z.unknown())),
    ])
    .transform((data) => (Array.isArray(data) ? data : Object.values(data))),
});
export const searchOptionsSchema = z.record(z.string(), z.unknown());
export function glpiFlag(value: unknown): boolean | null {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["sim", "yes", "true"].includes(normalized)) return true;
    if (["não", "nao", "no", "false"].includes(normalized)) return false;
  }
  if (value === 1 || value === "1" || value === true) return true;
  if (value === 0 || value === "0" || value === false) return false;
  return null;
}
