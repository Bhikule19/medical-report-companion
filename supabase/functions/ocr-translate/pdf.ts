import { getDocumentProxy } from 'https://esm.sh/unpdf@0.12.1';

export async function extractDigitalPdfText(bytes: Uint8Array): Promise<string> {
  const doc = await getDocumentProxy(bytes);
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(
      content.items
        .map((it: unknown) => (typeof (it as { str?: unknown }).str === 'string' ? (it as { str: string }).str : ''))
        .join(' '),
    );
  }
  return parts.join('\n').trim();
}

export async function isDigitalPdf(bytes: Uint8Array): Promise<boolean> {
  const text = await extractDigitalPdfText(bytes);
  return text.length > 50; // heuristic: scanned PDFs return little/no text
}

export async function probeDigitalPdf(
  bytes: Uint8Array,
): Promise<{ isDigital: boolean; text: string; pageCount: number }> {
  const doc = await getDocumentProxy(bytes);
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(
      content.items
        .map((it: unknown) =>
          typeof (it as { str?: unknown }).str === 'string' ? (it as { str: string }).str : '',
        )
        .join(' '),
    );
  }
  const text = parts.join('\n').trim();
  return { isDigital: text.length > 50, text, pageCount: doc.numPages };
}
