export function advisories(technology: "PHP" | "Next.js", version: string) {
  const [major, minor, patch] = version.split(".").map(Number);
  const assess = (threshold: number | undefined) =>
    !version || threshold === undefined
      ? "Confirme a versão e a aplicabilidade com o fornecedor."
      : patch < threshold
        ? "Versão informada abaixo da correção publicada para esta série."
        : "Versão informada alcança a correção deste aviso na série avaliada.";

  if (technology === "PHP") {
    const php2shell = [35, 36, 27, 12][minor - 2];
    const cgi = [20, 8][minor - 2];
    return [
      {
        name: "PHP2Shell · CVE-2026-109618 e CVE-2026-109619",
        url: "https://www.php.net/archive/2026.php#2026-10-21-5",
        result: assess(major === 8 ? php2shell : undefined),
        advice:
          "Atualize para uma versão corrigida pelo fornecedor. Confira backports da distribuição.",
      },
      {
        name: "PHP CGI · CVE-2024-4577",
        url: "https://www.php.net/ChangeLog-8.php#8.3.8",
        result: assess(major === 8 ? cgi : undefined),
        advice:
          "Confirme se a implantação usa PHP CGI no Windows e consulte as atualizações do fornecedor.",
      },
    ];
  }
  return [
    {
      name: "React Server Components · CVE-2025-66478",
      url: "https://nextjs.org/blog/CVE-2025-66478",
      result: assess(
        major === 15
          ? [5, 9, 6, 6, 8, 7][minor]
          : major === 16 && minor === 0
            ? 7
            : undefined,
      ),
      advice:
        "Confirme o uso de App Router com React Server Components e atualize a série implantada.",
    },
    {
      name: "Avisos adicionais do Next.js",
      url: "https://github.com/vercel/next.js/security/advisories",
      result:
        "Consulte o catálogo oficial para outros avisos da versão instalada.",
      advice:
        "Confira o inventário do servidor e mantenha as dependências atualizadas.",
    },
  ];
}
