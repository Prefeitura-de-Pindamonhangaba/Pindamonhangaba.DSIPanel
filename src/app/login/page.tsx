import type { Metadata } from "next";
import { getLoginPageController } from "@/modules/auth/controllers/login-page-controller";
import { LoginPage } from "@/modules/auth/views/login-page";
export const metadata: Metadata = { title: "Login | DSI Panel" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LoginPage {...await getLoginPageController(await searchParams)} />;
}
