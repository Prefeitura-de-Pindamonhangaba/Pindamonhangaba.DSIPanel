export class IntegrationError extends Error {
  constructor(
    public readonly source: string,
    public readonly status?: number,
  ) {
    super(`Não foi possível consultar ${source}.`);
  }
}
export async function requestJsonWithMeta(
  url: URL,
  source: string,
  headers: Record<string, string> = {},
  fetcher: typeof fetch = fetch,
) {
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", ...headers },
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });
    if (!response.ok) throw new IntegrationError(source, response.status);
    const reader = response.body?.getReader();
    if (!reader) throw new IntegrationError(source);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 16 * 1024 * 1024) throw new IntegrationError(source);
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      data: JSON.parse(new TextDecoder().decode(buffer)) as unknown,
      headers: response.headers,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError(source);
  }
}
export async function requestJson(
  url: URL,
  source: string,
  headers: Record<string, string> = {},
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  return (await requestJsonWithMeta(url, source, headers, fetcher)).data;
}

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  operation: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let failed = false;
  let failure: unknown;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (!failed && next < items.length) {
        const index = next++;
        try {
          results[index] = await operation(items[index]);
        } catch (error) {
          failed = true;
          failure = error;
        }
      }
    }),
  );
  if (failed) throw failure;
  return results;
}
