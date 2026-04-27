import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

export interface VisionDeps {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export async function ocrViaVision(
  bytes: Uint8Array,
  _mimeType: string,
  deps: VisionDeps,
): Promise<string> {
  const f = deps.fetchImpl ?? fetch;
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${deps.apiKey}`;
  const body = {
    requests: [
      {
        image: { content: encodeBase64(bytes) },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      },
    ],
  };
  const res = await f(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`vision_failed: ${res.status}`);
  const json = await res.json();
  return json.responses?.[0]?.fullTextAnnotation?.text ?? '';
}
