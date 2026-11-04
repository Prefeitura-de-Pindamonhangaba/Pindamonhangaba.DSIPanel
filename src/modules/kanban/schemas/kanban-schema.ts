import { z } from "zod";
const column = z.enum(["todo", "doing", "review", "done"]);
const fields = {
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000),
  priority: z.enum(["low", "normal", "high"]),
  dueOn: z.iso.date().nullable(),
};
const target = {
  id: z.uuid(),
  version: z.number().int().positive().max(2147483646),
};
export const kanbanMutationSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), column, ...fields }),
  z.strictObject({ action: z.literal("edit"), ...target, ...fields }),
  z.strictObject({ action: z.literal("move"), ...target, column }),
  z.strictObject({
    action: z.literal("archive"),
    ...target,
    archived: z.boolean(),
  }),
]);
