import { getDashboardPageController } from "@/modules/dashboard/controllers/dashboard-page-controller";
import { DashboardPage } from "@/modules/dashboard/views/dashboard-page";
export default function Page() {
  return <DashboardPage data={getDashboardPageController()} />;
}
