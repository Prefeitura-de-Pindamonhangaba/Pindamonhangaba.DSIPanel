import { z } from "zod";
import { subjectSchema } from "../services/keycloak-config";
export const provisionUserSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("provision"),
    actorId: z.uuid().optional(),
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    subject: subjectSchema,
    role: z.enum(["member", "admin"]),
  }),
  z.strictObject({
    action: z.literal("deactivate"),
    actorId: z.uuid(),
    userId: z.uuid(),
  }),
]);
