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

// OCR a PDF using Vision's files:annotate endpoint.
//
// images:annotate returns no text for inline PDFs. files:annotate accepts an
// inline base64 PDF and processes up to 5 pages per call. For longer PDFs we
// send pages 1..5 explicitly and silently drop pages 6+. Most medical reports
// are 1-3 pages; pagination beyond 5 (via asyncBatchAnnotate + GCS) is future work.
export async function ocrPdfViaVision(
  bytes: Uint8Array,
  deps: VisionDeps,
): Promise<string> {
  const f = deps.fetchImpl ?? fetch;
  const url = `https://vision.googleapis.com/v1/files:annotate?key=${deps.apiKey}`;
  const body = {
    requests: [
      {
        inputConfig: {
          content: encodeBase64(bytes),
          mimeType: 'application/pdf',
        },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        pages: [1, 2, 3, 4, 5],
      },
    ],
  };
  const res = await f(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`vision_files_failed_${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = await res.json();
  // Shape: { responses: [{ responses: [{ fullTextAnnotation: { text } }, ...] }] }
  const pageResponses: Array<{ fullTextAnnotation?: { text?: string } }> =
    json.responses?.[0]?.responses ?? [];
  return pageResponses
    .map((p) => p?.fullTextAnnotation?.text ?? '')
    .filter((t) => t.length > 0)
    .join('\n\n')
    .trim();
}
