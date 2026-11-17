export const targets = {
  "https://pat.pindamonhangaba.sp.gov.br/": "PHP",
  "https://identifica.pindamonhangaba.sp.gov.br/": "Next.js",
} as const;

export async function diagnose(url: keyof typeof targets) {
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const headers = response.headers;
  return {
    status: response.status,
    checks: [
      ["Strict-Transport-Security", "Configure HSTS após validar o HTTPS."],
      [
        "Content-Security-Policy",
        "Defina uma política adequada aos recursos da página.",
      ],
      ["X-Content-Type-Options", "Configure nosniff."],
      ["Referrer-Policy", "Defina uma política de referência explícita."],
      [
        "Permissions-Policy",
        "Restrinja recursos do navegador conforme a aplicação.",
      ],
    ].map(([name, advice]) => ({ name, advice, present: headers.has(name) })),
    cookies: headers.getSetCookie().map((cookie, index) => {
      const attributes = cookie
        .split(";")
        .slice(1)
        .map((item) => item.trim());
      return {
        index: index + 1,
        secure: attributes.some((value) => /^secure$/i.test(value)),
        httpOnly: attributes.some((value) => /^httponly$/i.test(value)),
        sameSite: attributes.some((value) =>
          /^samesite=(strict|lax|none)$/i.test(value),
        ),
      };
    }),
  };
}
