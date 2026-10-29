export interface ContractDocument {
  id: string;
  title: string;
  filename: string;
  url: string;
  kind: "contract" | "amendment" | "notice" | "other";
  publishedAt: string | null;
}
export interface MunicipalContract {
  sourceId: string;
  number: string;
  object: string;
  department: string;
  supplierName: string;
  supplierDocument: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
  totalValue: string;
  procurement: string;
  procurementType: string;
  procurementId: string | null;
  documents: ContractDocument[];
  sourceUrl: string;
  issues: string[];
}
