import { getContractsPageController } from "@/modules/contracts/controllers/contracts-page-controller";
import { ContractsPage } from "@/modules/contracts/views/contracts-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ContractsPage
      data={await getContractsPageController(await searchParams)}
    />
  );
}
