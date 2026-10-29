import { getTicketsPageController } from "@/modules/tickets/controllers/tickets-page-controller";
import { TicketsPage } from "@/modules/tickets/views/tickets-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <TicketsPage data={await getTicketsPageController(await searchParams)} />
  );
}
