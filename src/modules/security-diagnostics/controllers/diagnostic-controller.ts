"use server";

import { z } from "zod";
import { requirePageAccess } from "@/modules/auth/controllers/access-controller";
import { diagnose, targets } from "../services/diagnose";

const input = z.object({
  url: z.enum([
    "https://pat.pindamonhangaba.sp.gov.br/",
    "https://identifica.pindamonhangaba.sp.gov.br/",
  ]),
  version: z.string().regex(/^(?:\d{1,4}\.\d{1,4}\.\d{1,4})?$/),
});

export async function runDiagnostic(form: FormData) {
  await requirePageAccess();
  const parsed = input.safeParse({
    url: form.get("url"),
    version: form.get("version"),
  });
  if (!parsed.success)
    return {
      error:
        "Selecione um endereço autorizado e informe uma versão estável no formato X.Y.Z, se disponível.",
    };
  const { url, version } = parsed.data;
  const technology = targets[url];
  const { advisories } = await import("../services/advisories");
  const reviews = advisories(technology, version);
  try {
    return {
      url,
      technology,
      version,
      reviews,
      observation: await diagnose(url),
    };
  } catch {
    return { url, technology, version, reviews, observation: null };
  }
}
