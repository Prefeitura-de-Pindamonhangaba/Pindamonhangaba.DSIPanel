import { z } from "zod";
export const portalId = z.union([
  z.string().regex(/^\d+$/),
  z.number().int().positive().transform(String),
]);
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? "");
export const dateText = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  })
  .nullable();
const portalDate = z
  .union([z.literal(""), dateText])
  .optional()
  .transform((value) => value || null);
export const contractsResponseSchema = z.object({
  contratos: z.array(
    z.object({
      id_contrato: portalId,
      contrato: z.string(),
      objeto: optionalText,
      ds_unidade: optionalText,
      nome_razao: z.string(),
      cnpj: optionalText,
      dt_inicio_contrato: portalDate,
      dt_termino_contrato: portalDate,
      situacao: z.string(),
      vl_total_f: z.union([
        z.string().regex(/^\d+(\.\d+)?$/),
        z.number().nonnegative().transform(String),
      ]),
      processo: optionalText,
      modalidade: optionalText,
    }),
  ),
});
export const adjustmentsResponseSchema = z.object({
  ajustes: z.array(
    z.object({
      dt_aditivo: portalDate,
      dt_inicio_vigencia: portalDate,
      dt_fim_vigencia: portalDate,
    }),
  ),
});
const contractAttachmentSchema = z.object({
  download: z.array(z.object({ id_anexo: portalId, id_contrato: portalId })),
  ds_anexo: optionalText,
  nome_arquivo: optionalText,
});
export const contractAttachmentsSchema = z
  .union([z.array(contractAttachmentSchema), contractAttachmentSchema])
  .transform((value) => (Array.isArray(value) ? value : [value]));
export const tendersResponseSchema = z.object({
  licitacoes: z.array(
    z.object({
      id_processo_compra: portalId,
      nr_processo_compra: z.union([z.string(), z.number().transform(String)]),
      nr_edital: optionalText,
      nr_modalidade: optionalText,
    }),
  ),
});
export const tenderAttachmentsSchema = z.array(
  z.object({
    id_anexo: portalId,
    id_licitacao: portalId,
    ds_licitacao_anexo: optionalText,
    nome_arquivo: optionalText,
    dt_inclusao: portalDate,
    dt_publicacao: portalDate,
  }),
);
