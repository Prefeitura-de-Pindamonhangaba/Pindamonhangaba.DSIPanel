import { expect, test } from "bun:test";
import {
  IntegrationError,
  mapLimit,
  requestJson,
} from "../../src/shared/lib/integrations/http";
test("falha externa não expõe diagnóstico com segredos e define timeout e proteção de redirecionamento", async () => {
  const fetcher = Object.assign(
    async (
      _input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.redirect).toBe("error");
      throw new DOMException(
        "fictitious-secret-in-remote-diagnostic",
        "TimeoutError",
      );
    },
    { preconnect: fetch.preconnect },
  );
  try {
    await requestJson(
      new URL("https://api.example.test/data"),
      "Fonte de teste",
      {},
      fetcher,
    );
    throw new Error("Deveria falhar.");
  } catch (error) {
    expect(error).toBeInstanceOf(IntegrationError);
    expect((error as Error).message).not.toContain("fictitious-secret");
  }
});
test("operações em lote encerram as pendências antes de liberar a sessão após erro", async () => {
  let active = 0;
  await expect(
    mapLimit([1, 2, 3, 4], 2, async (item) => {
      active++;
      try {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (item === 1) throw new Error("source failed");
        return item;
      } finally {
        active--;
      }
    }),
  ).rejects.toThrow("source failed");
  expect(active).toBe(0);
});
