"use server";

import { z } from "zod";
import { requirePageAccess } from "@/modules/auth/controllers/access-controller";
import { diagnose, parseTarget } from "../services/diagnose";

export async function runDiagnostic(form: FormData) {
  await requirePageAccess();
  const input = z.string().trim().min(1).max(2048).safeParse(form.get("url"));
  let url: URL;
  try {
    if (!input.success) throw new Error();
    url = parseTarget(input.data);
  } catch {
    return {
      error:
        "Informe uma URL HTTPS pública com domínio, sem credenciais, parâmetros ou porta personalizada.",
    };
  }

  try {
    return {
      url: url.href,
      timestamp: new Date().toISOString(),
      observation: await diagnose(url),
    };
  } catch {
    return {
      error:
        "Não foi possível consultar o destino por HTTPS. Confira o endereço, o certificado e a disponibilidade pública.",
    };
  }
}
