import { corsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/ratelimit.ts';
import { ocrRequestSchema } from '../_shared/validate.ts';
import { validateFile } from './file-guard.ts';
import { orchestrate } from './orchestrate.ts';

const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
const translateApiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
if (!visionApiKey || !translateApiKey) {
  throw new Error(
    'missing_api_keys: GOOGLE_CLOUD_VISION_API_KEY and GOOGLE_TRANSLATE_API_KEY are required',
  );
}

const rateLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimiter.check(ip).allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }
  try {
    const form = await req.formData();
    const file = form.get('file');
    const targetLanguageRaw = form.get('target_language');
    if (!(file instanceof File)) return json({ error: 'missing_file' }, 400);
    const guard = validateFile({ size: file.size, type: file.type });
    if (!guard.ok) return json({ error: guard.error }, 400);
    const parsed = ocrRequestSchema.safeParse({ target_language: targetLanguageRaw });
    if (!parsed.success) return json({ error: 'invalid_target_language' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await orchestrate({
      bytes,
      mimeType: file.type,
      targetLang: parsed.data.target_language,
      deps: { visionApiKey, translateApiKey },
    });
    if (!result.original_text || result.original_text.trim().length === 0) {
      return json({ error: 'no_text_extracted' }, 422);
    }
    return json(result, 200);
  } catch (e) {
    console.error('ocr-translate error', { message: (e as Error).message });
    return json({ error: 'internal_error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
