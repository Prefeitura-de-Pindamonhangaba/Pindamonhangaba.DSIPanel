import { z } from "zod";
export function parseGlpiEnvironment(
  input: Record<string, string | undefined>,
) {
  if (!input.GLPI_APP_TOKEN && !input.GLPI_USER_TOKEN)
    return { enabled: false as const };
  const parsed = z
    .object({
      GLPI_API_URL: z
        .url()
        .default("https://glpi.pindamonhangaba.sp.gov.br/apirest.php/")
        .refine((value) => {
          if (!URL.canParse(value)) return false;
          const url = new URL(value);
          return (
            url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash &&
            /\/apirest\.php\/?$/.test(url.pathname)
          );
        }),
      GLPI_APP_TOKEN: z.string().min(1),
      GLPI_USER_TOKEN: z.string().min(1),
      GLPI_DSI_GROUP_ID: z.preprocess(
        (value) => (value === "" ? undefined : value),
        z.coerce.number().int().positive().optional(),
      ),
      GLPI_TIME_ZONE: z
        .string()
        .default("America/Sao_Paulo")
        .refine((value) => {
          try {
            new Intl.DateTimeFormat("pt-BR", { timeZone: value });
            return true;
          } catch {
            return false;
          }
        }),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new Error(
      "Configuração GLPI incompleta ou inválida. Verifique as variáveis GLPI no ambiente.",
    );
  return {
    enabled: true as const,
    baseURL: parsed.data.GLPI_API_URL.replace(/\/?$/, "/"),
    appToken: parsed.data.GLPI_APP_TOKEN,
    userToken: parsed.data.GLPI_USER_TOKEN,
    groupId: parsed.data.GLPI_DSI_GROUP_ID,
    timeZone: parsed.data.GLPI_TIME_ZONE,
  };
}
