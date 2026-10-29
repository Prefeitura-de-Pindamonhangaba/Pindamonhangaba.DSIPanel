import {
  requestJson,
  mapLimit,
  IntegrationError,
} from "@/shared/lib/integrations/http";
import {
  documentDigits,
  normalizeName,
} from "@/shared/lib/integrations/normalization";
import {
  adjustmentsResponseSchema,
  contractAttachmentsSchema,
  contractsResponseSchema,
  tenderAttachmentsSchema,
  tendersResponseSchema,
} from "../schemas/portal-schema";
import {
  belongsToSetip,
  isContractCurrent,
  procurementKey,
} from "./contract-policy";
import type {
  ContractDocument,
  MunicipalContract,
} from "../models/contract-types";

export const TRANSPARENCY_API =
  "https://siapegov.pindamonhangaba.sp.gov.br/portal-transparencia/api/";
export function createTransparencyAdapter(fetcher: typeof fetch = fetch) {
  const get = (path: string, query: Record<string, string>) => {
    const url = new URL(path, TRANSPARENCY_API);
    for (const [key, value] of Object.entries(query))
      url.searchParams.set(key, value);
    return requestJson(url, "Portal da Transparência", {}, fetcher);
  };
  const documentUrl = (
    kind: "contract" | "tender",
    id: string,
    parent: string,
  ) => {
    const url = new URL(
      kind === "contract"
        ? "licitacoes/contratos/anexos.anexo"
        : "licitacoes/licitacoes/anexos.anexo",
      TRANSPARENCY_API,
    );
    url.searchParams.set("id_anexo", id);
    if (kind === "tender") url.searchParams.set("id_processo_compra", parent);
    return url.href;
  };
  return {
    async capture(today: string) {
      try {
        // O período completo evita perder contratos antigos prorrogados.
        const result = contractsResponseSchema.parse(
          await get("licitacoes/contratos/contratos", {
            id_entidade: "1",
            data_inicial: "1900-01-01",
            data_final: today,
          }),
        );
        const selected = result.contratos.filter((item) =>
          belongsToSetip(item.ds_unidade),
        );
        if (
          new Set(selected.map((item) => item.id_contrato)).size !==
          selected.length
        )
          throw new IntegrationError("Portal da Transparência");
        const contracts = await mapLimit(
          selected,
          4,
          async (item): Promise<MunicipalContract> => {
            const adjustments = adjustmentsResponseSchema.parse(
              await get("licitacoes/contratos/ajustes", {
                id_contrato: item.id_contrato,
              }),
            ).ajustes;
            const latest = adjustments
              .filter(
                (adjustment) =>
                  adjustment.dt_aditivo &&
                  adjustment.dt_aditivo <= today &&
                  adjustment.dt_fim_vigencia,
              )
              .sort((a, b) => b.dt_aditivo!.localeCompare(a.dt_aditivo!))[0];
            // O último termo publicado também pode reduzir a vigência.
            const endsOn = latest?.dt_fim_vigencia ?? item.dt_termino_contrato;
            return {
              sourceId: item.id_contrato,
              number: item.contrato,
              object: item.objeto,
              department: item.ds_unidade,
              supplierName: item.nome_razao,
              supplierDocument: documentDigits(item.cnpj),
              startsOn: item.dt_inicio_contrato,
              endsOn,
              status: item.situacao,
              totalValue: item.vl_total_f,
              procurement: item.processo,
              procurementType: item.modalidade,
              procurementId: null,
              documents: [],
              issues: [],
              sourceUrl: new URL(
                `licitacoes/contratos/anexos?id_contrato=${item.id_contrato}`,
                TRANSPARENCY_API,
              ).href,
            };
          },
        );
        const current = contracts.filter((contract) =>
          isContractCurrent(contract, today),
        );
        const years = [
          ...new Set(
            current
              .map((contract) => procurementKey(contract.procurement)?.year)
              .filter((year): year is number => year !== undefined),
          ),
        ];
        const tendersByYear = new Map(
          await mapLimit(
            years,
            3,
            async (year) =>
              [
                year,
                tendersResponseSchema.parse(
                  await get("licitacoes/licitacoes/index", {
                    id_entidade: "1",
                    data_inicial: `${year}-01-01`,
                    data_final: `${year}-12-31`,
                  }),
                ).licitacoes,
              ] as const,
          ),
        );
        await mapLimit(current, 4, async (contract) => {
          const files = contractAttachmentsSchema.parse(
            await get("licitacoes/contratos/anexos", {
              id_contrato: contract.sourceId,
            }),
          );
          for (const file of files)
            for (const download of file.download) {
              if (download.id_contrato !== contract.sourceId)
                throw new IntegrationError("Portal da Transparência");
              const text = normalizeName(
                `${file.ds_anexo} ${file.nome_arquivo}`,
              );
              contract.documents.push({
                id: `contract-${download.id_anexo}`,
                title:
                  file.ds_anexo || file.nome_arquivo || "Documento do contrato",
                filename: file.nome_arquivo,
                url: documentUrl(
                  "contract",
                  download.id_anexo,
                  contract.sourceId,
                ),
                kind: /ADIT|\bADT\b|PRORROG|APOSTIL|CESSAO|RESCISAO/.test(text)
                  ? "amendment"
                  : /CONTRATO|\bCT\b/.test(text)
                    ? "contract"
                    : "other",
                publishedAt: null,
              });
            }
          const key = procurementKey(contract.procurement);
          const matches = key
            ? (tendersByYear.get(key.year) ?? []).filter(
                (tender) =>
                  String(
                    Number(tender.nr_processo_compra.replace(/\D/g, "")),
                  ) === key.number,
              )
            : [];
          if (matches.length === 1) {
            contract.procurementId = matches[0].id_processo_compra;
            const attachments = tenderAttachmentsSchema.parse(
              await get("licitacoes/licitacoes/anexos", {
                id_processo_compra: contract.procurementId,
              }),
            );
            for (const file of attachments) {
              if (file.id_licitacao !== contract.procurementId)
                throw new IntegrationError("Portal da Transparência");
              const label = normalizeName(
                `${file.ds_licitacao_anexo} ${file.nome_arquivo}`,
              );
              const kind: ContractDocument["kind"] =
                /EDITAL/.test(label) && !/AVISO/.test(label)
                  ? "notice"
                  : "other";
              contract.documents.push({
                id: `tender-${file.id_anexo}`,
                title: file.ds_licitacao_anexo || file.nome_arquivo,
                filename: file.nome_arquivo,
                url: documentUrl(
                  "tender",
                  file.id_anexo,
                  contract.procurementId,
                ),
                kind,
                publishedAt: file.dt_inclusao ?? file.dt_publicacao,
              });
            }
          } else
            contract.issues.push(
              matches.length > 1
                ? "Licitação com associação ambígua no portal."
                : "Processo de licitação não localizado no portal.",
            );
          if (
            !contract.documents.some((document) => document.kind === "contract")
          )
            contract.issues.push(
              "Instrumento original não localizado nos anexos deste contrato; confira também os aditivos e os documentos da licitação.",
            );
          if (
            !contract.documents.some((document) => document.kind === "notice")
          )
            contract.issues.push(
              /DISPENSA|INEXIGIBILIDADE/.test(
                normalizeName(contract.procurementType),
              )
                ? "Contratação direta: edital de licitação não identificado."
                : "Edital não localizado entre os documentos publicados.",
            );
          return contract;
        });
        return {
          contracts,
          examined: result.contratos.length,
          departmentCount: selected.length,
          currentCount: current.length,
        };
      } catch (error) {
        if (error instanceof IntegrationError) throw error;
        throw new IntegrationError("Portal da Transparência");
      }
    },
  };
}
