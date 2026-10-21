import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DSI Panel | Início",
  description:
    "Ambiente interno do Departamento de Sistemas da Prefeitura de Pindamonhangaba",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
