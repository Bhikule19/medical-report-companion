import { corsHeaders } from '../_shared/cors.ts';
import { chatRequestSchema } from '../_shared/validate.ts';
import { createRateLimiter } from '../_shared/ratelimit.ts';
import { handleChatRequest } from './orchestrate.ts';

const groqApiKey = Deno.env.get('GROQ_API_KEY');
if (!groqApiKey) {
  throw new Error('missing_api_keys: GROQ_API_KEY is required');
}

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  try {
    return await handleChatRequest(parsed.data, { groqApiKey });
  } catch (e) {
    console.error('chat error', { message: (e as Error).message });
    return jsonResponse({ error: 'internal_error' }, 500);
  }
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
