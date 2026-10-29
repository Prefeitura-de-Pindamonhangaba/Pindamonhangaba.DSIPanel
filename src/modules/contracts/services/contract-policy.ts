import type {
  ContractDocument,
  MunicipalContract,
} from "../models/contract-types";
import { normalizeName } from "@/shared/lib/integrations/normalization";
export const SETIP_DEPARTMENT =
  "SECRETARIA MUNICIPAL DE TECNOLOGIA, INOVAÇÃO E PROJETOS";
export const RELATED_DEPARTMENTS = [
  SETIP_DEPARTMENT,
  "DEPARTAMENTO DE TECNOLOGIA E INFORMAÇÃO",
];
export function orderContractDocuments(documents: ContractDocument[]) {
  const order = { contract: 0, notice: 1, amendment: 2, other: 3 };
  return [...documents].sort(
    (a, b) =>
      order[a.kind] - order[b.kind] ||
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
}
export function belongsToSetip(department: string) {
  return RELATED_DEPARTMENTS.some(
    (name) => normalizeName(department) === normalizeName(name),
  );
}
export function isContractCurrent(
  contract: Pick<MunicipalContract, "startsOn" | "endsOn" | "status">,
  today: string,
) {
  const status = normalizeName(contract.status);
  return Boolean(
    contract.startsOn &&
    contract.endsOn &&
    contract.startsOn <= today &&
    contract.endsOn >= today &&
    ["EM ANDAMENTO", "VIGENTE", "ATIVO", "EM EXECUCAO"].includes(status),
  );
}
export function procurementKey(value: string) {
  const match = value.match(/([\d.]+)\s*\/\s*(\d{4})/);
  if (!match) return null;
  return {
    number: String(Number(match[1].replace(/\./g, ""))),
    year: Number(match[2]),
  };
}
