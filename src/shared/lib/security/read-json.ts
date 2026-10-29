export async function readJson(
  request: Request,
  maxBytes = 4096,
): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new Error("Conteúdo inválido.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Conteúdo ausente.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Conteúdo muito grande.");
      chunks.push(value);
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(buffer));
  } finally {
    await reader.cancel();
  }
}
