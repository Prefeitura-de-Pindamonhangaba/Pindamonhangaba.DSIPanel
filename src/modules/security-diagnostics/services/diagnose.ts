import { resolve4 } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIPv4 } from "node:net";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const)
  blocked.addSubnet(address, prefix);

export function parseTarget(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.hostname.includes(".") ||
    isIPv4(url.hostname)
  ) {
    throw new Error(
      "Informe uma URL HTTPS pública com domínio, sem credenciais, parâmetros ou porta personalizada.",
    );
  }
  return url;
}

export async function diagnose(url: URL) {
  const signal = AbortSignal.timeout(8000);
  const addresses = await Promise.race([
    resolve4(url.hostname),
    new Promise<never>((_, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      }),
    ),
  ]);
  if (
    !addresses.length ||
    addresses.some((ip) => !isIPv4(ip) || blocked.check(ip))
  ) {
    throw new Error("Destino indisponível para consulta pública.");
  }

  // Conecta ao endereço validado, mantendo SNI e verificação do certificado do domínio.
  const { headers, status } = await new Promise<{
    headers: import("node:http").IncomingHttpHeaders;
    status: number;
  }>((resolve, reject) => {
    const req = request(
      {
        hostname: addresses[0],
        servername: url.hostname,
        port: 443,
        path: url.pathname,
        method: "HEAD",
        headers: { Host: url.hostname },
        rejectUnauthorized: true,
        agent: false,
        signal,
      },
      (response) => {
        response.resume();
        resolve({
          headers: response.headers,
          status: response.statusCode ?? 0,
        });
      },
    );
    req.on("error", reject);
    req.end();
  });

  const checks = [
    [
      "strict-transport-security",
      "Strict-Transport-Security",
      "Configure HSTS após validar o HTTPS.",
    ],
    [
      "content-security-policy",
      "Content-Security-Policy",
      "Defina uma política adequada aos recursos da página.",
    ],
    [
      "x-content-type-options",
      "X-Content-Type-Options",
      "Configure o cabeçalho com nosniff.",
    ],
    [
      "referrer-policy",
      "Referrer-Policy",
      "Defina uma política explícita, como strict-origin-when-cross-origin.",
    ],
    [
      "permissions-policy",
      "Permissions-Policy",
      "Restrinja os recursos do navegador conforme a aplicação.",
    ],
  ].map(([key, name, advice]) => ({
    name,
    advice,
    ok:
      Boolean(headers[key]) &&
      (key !== "x-content-type-options" || headers[key] === "nosniff"),
  }));

  const cookies = headers["set-cookie"] ?? [];
  for (const [index, cookie] of cookies.entries()) {
    const attributes = cookie
      .split(";")
      .slice(1)
      .map((item) => item.trim());
    for (const [name, pattern, advice] of [
      ["Secure", /^secure$/i, "Envie o cookie apenas por HTTPS com Secure."],
      [
        "HttpOnly",
        /^httponly$/i,
        "Use HttpOnly em cookies de sessão que o JavaScript não precisa ler.",
      ],
      [
        "SameSite",
        /^samesite=(strict|lax|none)$/i,
        "Defina SameSite conforme o fluxo. Use Secure se precisar de SameSite=None.",
      ],
    ] as const) {
      checks.push({
        name: `Cookie ${index + 1} · ${name}`,
        ok: attributes.some((value) => pattern.test(value)),
        advice,
      });
    }
  }
  return { status, checks, cookieCount: cookies.length };
}
