import { detectLanguage } from './detect-lang.ts';
import { isDigitalPdf, extractDigitalPdfText } from './pdf.ts';
import { ocrViaVision } from './vision.ts';
import { translateWithGlossary } from './translate.ts';
import type { Lang } from '../_shared/glossary.ts';

export interface OrchestrateInput {
  bytes: Uint8Array;
  mimeType: string;
  targetLang: Lang;
  deps: {
    visionApiKey: string;
    translateApiKey: string;
    visionFetch?: typeof fetch;
    translateFetch?: typeof fetch;
  };
}

export interface OrchestrateResult {
  original_text: string;
  translated_text: string;
  source_language: Lang;
  target_language: Lang;
  page_count: number | null;
}

export async function orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
  const { bytes, mimeType, targetLang, deps } = input;
  let original = '';
  const pageCount: number | null = null;

  if (mimeType === 'application/pdf') {
    // pdfjs transfers the ArrayBuffer, so we pass fresh copies to each call.
    if (await isDigitalPdf(bytes.slice())) {
      original = await extractDigitalPdfText(bytes.slice());
    } else {
      original = await ocrViaVision(bytes, mimeType, {
        apiKey: deps.visionApiKey,
        fetchImpl: deps.visionFetch,
      });
    }
  } else {
    original = await ocrViaVision(bytes, mimeType, {
      apiKey: deps.visionApiKey,
      fetchImpl: deps.visionFetch,
    });
  }

  const source = await detectLanguage(original, {
    apiKey: deps.translateApiKey,
    fetchImpl: deps.translateFetch,
  });

  const translated =
    source === targetLang
      ? original
      : await translateWithGlossary(original, source, targetLang, {
          apiKey: deps.translateApiKey,
          fetchImpl: deps.translateFetch,
        });

  return {
    original_text: original,
    translated_text: translated,
    source_language: source,
    target_language: targetLang,
    page_count: pageCount,
  };
}
