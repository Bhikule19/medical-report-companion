import { corsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/ratelimit.ts';
import { langSchema } from '../_shared/validate.ts';
import { transcribe } from './stt.ts';
import { synthesize } from './tts.ts';

const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');
if (!deepgramApiKey) {
  throw new Error('missing_api_keys: DEEPGRAM_API_KEY is required');
}

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
const MAX_TTS_CHARS = 5000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimiter.check(ip).allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const contentType = req.headers.get('content-type') ?? '';

  try {
    if (contentType.startsWith('multipart/form-data')) {
      // STT path
      const form = await req.formData();
      const audio = form.get('audio');
      const langRaw = form.get('language');
      if (!(audio instanceof File)) return jsonResponse({ error: 'missing_audio' }, 400);
      if (audio.size > MAX_AUDIO_BYTES) {
        return jsonResponse({ error: 'audio_too_large' }, 413);
      }
      const langParsed = langSchema.safeParse(langRaw);
      if (!langParsed.success) return jsonResponse({ error: 'invalid_language' }, 400);

      const bytes = new Uint8Array(await audio.arrayBuffer());
      const result = await transcribe(bytes, audio.type, langParsed.data, {
        apiKey: deepgramApiKey,
      });
      return jsonResponse(result, 200);
    }

    // TTS path: JSON body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }
    const obj = body as { text?: unknown; language?: unknown };
    if (typeof obj.text !== 'string' || obj.text.trim().length === 0) {
      return jsonResponse({ error: 'missing_text' }, 400);
    }
    if (obj.text.length > MAX_TTS_CHARS) {
      return jsonResponse({ error: 'text_too_long' }, 413);
    }
    const langParsed = langSchema.safeParse(obj.language);
    if (!langParsed.success) return jsonResponse({ error: 'invalid_language' }, 400);

    const { audio, mimeType } = await synthesize(obj.text, langParsed.data, {
      apiKey: deepgramApiKey,
    });
    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('voice error', { message: (e as Error).message });
    return jsonResponse({ error: 'internal_error' }, 500);
  }
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
