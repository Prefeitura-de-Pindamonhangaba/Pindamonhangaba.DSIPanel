import { expect, test } from "bun:test";
import {
  belongsToSetip,
  isContractCurrent,
  orderContractDocuments,
} from "../../src/modules/contracts/services/contract-policy";
import { createTransparencyAdapter } from "../../src/modules/contracts/services/transparency-adapter";
import { createContractService } from "../../src/modules/contracts/services/contract-service";
import { contractFixture } from "../fixtures/integration-data";
const today = "2026-10-29";
test("documentos mantêm instrumento primeiro e edital mais recente antes do anterior", () => {
  const [instrument, notice] = contractFixture().documents;
  const newer = {
    ...notice,
    id: "reopening",
    title: "Edital de reabertura",
    publishedAt: "2026-06-01",
  };
  expect(
    orderContractDocuments([notice, newer, instrument]).map(
      (document) => document.id,
    ),
  ).toEqual([instrument.id, "reopening", notice.id]);
});
test("vigência exige unidade certa, datas inclusivas e situação conhecida", () => {
  expect(
    belongsToSetip(
      "  SECRETARIA MUNICIPAL DE TECNOLOGIA, INOVACAO E PROJETOS ",
    ),
  ).toBe(true);
  expect(belongsToSetip("DEPARTAMENTO DE TECNOLOGIA E INFORMAÇÃO")).toBe(true);
  expect(belongsToSetip("SECRETARIA MUNICIPAL DE SAÚDE")).toBe(false);
  expect(isContractCurrent(contractFixture({ endsOn: today }), today)).toBe(
    true,
  );
  expect(
    isContractCurrent(contractFixture({ endsOn: "2026-10-28" }), today),
  ).toBe(false);
  expect(
    isContractCurrent(contractFixture({ startsOn: "2026-10-30" }), today),
  ).toBe(false);
  expect(
    isContractCurrent(contractFixture({ status: "Rescindido" }), today),
  ).toBe(false);
  expect(
    isContractCurrent(contractFixture({ status: "Desconhecido" }), today),
  ).toBe(false);
  expect(isContractCurrent(contractFixture({ endsOn: null }), today)).toBe(
    false,
  );
});
test("adapter inclui aditivos, edital de reabertura e mantém URLs no portal", async () => {
  const calls: string[] = [];
  const fetcher = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (url.pathname.endsWith("/contratos/contratos")) {
        expect(url.searchParams.get("data_inicial")).toBe("1900-01-01");
        return Response.json({
          contratos: [
            {
              id_contrato: "100",
              contrato: "001 / 2026",
              objeto: "Fictício",
              ds_unidade: contractFixture().department,
              nome_razao: "Fornecedor fictício",
              cnpj: "12.345.678/0001-90",
              dt_inicio_contrato: "2026-01-01",
              dt_termino_contrato: "2026-10-01",
              situacao: "Em andamento",
              vl_total_f: "100.00",
              processo: "123 / 2026",
              modalidade: "Pregão",
            },
          ],
        });
      }
      if (url.pathname.endsWith("/contratos/ajustes"))
        return Response.json({
          ajustes: [
            {
              dt_aditivo: "2026-09-01",
              dt_inicio_vigencia: "2026-01-01",
              dt_fim_vigencia: "2027-01-01",
            },
          ],
        });
      if (url.pathname.endsWith("/contratos/anexos"))
        return Response.json({
          download: [{ id_anexo: "50", id_contrato: "100" }],
          ds_anexo: "CONTRATO",
          nome_arquivo: "contrato.pdf",
        });
      if (url.pathname.endsWith("/licitacoes/index"))
        return Response.json({
          licitacoes: [
            {
              id_processo_compra: "200",
              nr_processo_compra: "123",
              nr_edital: "1/2026",
              nr_modalidade: "1/2026",
            },
          ],
        });
      if (url.pathname.endsWith("/licitacoes/anexos"))
        return Response.json([
          {
            id_anexo: "60",
            id_licitacao: "200",
            ds_licitacao_anexo: "EDITAL DE REABERTURA",
            nome_arquivo: "edital.pdf",
            dt_inclusao: "2026-01-01",
            dt_publicacao: "2026-01-02",
          },
        ]);
      throw new Error("Requisição inesperada.");
    },
    { preconnect: fetch.preconnect },
  );
  const result = await createTransparencyAdapter(fetcher).capture(today);
  expect(result.currentCount).toBe(1);
  expect(result.contracts[0].endsOn).toBe("2027-01-01");
  expect(
    result.contracts[0].documents.map((document) => document.kind),
  ).toEqual(["contract", "notice"]);
  expect(
    result.contracts[0].documents.every(
      (document) =>
        new URL(document.url).hostname === "siapegov.pindamonhangaba.sp.gov.br",
    ),
  ).toBe(true);
  expect(calls.length).toBe(5);
});
test("falha na captura preserva a lista anterior e registra indisponibilidade", async () => {
  let failed = false,
    saved = false;
  const repository = {
    list: async () => [contractFixture()],
    syncState: async () => null,
    saveSnapshot: async () => {
      saved = true;
    },
    markFailure: async () => {
      failed = true;
    },
  };
  const service = createContractService(repository, {
    capture: async () => {
      throw new Error("source down");
    },
  });
  await expect(service.synchronize()).rejects.toThrow("preservada");
  expect(failed).toBe(true);
  expect(saved).toBe(false);
  expect(await service.catalog()).toHaveLength(1);
});
