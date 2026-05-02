import { describe, it, expect, vi } from 'vitest';
import { ocrTranslate } from './ocrTranslate';

const config = { url: 'https://x.supabase.co', anonKey: 'anon' };

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('ocrTranslate errors', () => {
  it('throws OcrError with retryAfter on 429', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'rate_limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '42' },
        }),
    );
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    await expect(
      ocrTranslate({ file, targetLang: 'hi', config, fetchImpl }),
    ).rejects.toMatchObject({ status: 429, retryAfterSeconds: 42 });
  });

  it('throws OcrError with parsed message on 4xx', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: 'invalid_target_language' }, { status: 400 }),
    );
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    await expect(
      ocrTranslate({ file, targetLang: 'hi', config, fetchImpl }),
    ).rejects.toMatchObject({ status: 400, message: 'invalid_target_language' });
  });

  it('throws fallback message on malformed error body', async () => {
    const fetchImpl = vi.fn(async () => new Response('not json', { status: 500 }));
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    await expect(
      ocrTranslate({ file, targetLang: 'hi', config, fetchImpl }),
    ).rejects.toMatchObject({ status: 500, message: 'ocr_failed_500' });
  });
});

describe('ocrTranslate happy path', () => {
  it('posts multipart form-data and returns parsed result', async () => {
    const file = new File(['hi'], 'r.pdf', { type: 'application/pdf' });
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        original_text: 'Patient John',
        translated_text: 'मरीज जॉन',
        source_language: 'en',
        target_language: 'hi',
        page_count: 1,
      }),
    );

    const result = await ocrTranslate({
      file,
      targetLang: 'hi',
      config,
      fetchImpl,
    });

    expect(result.original_text).toBe('Patient John');
    expect(result.page_count).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.supabase.co/functions/v1/ocr-translate');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer anon');
    expect(headers.get('apikey')).toBe('anon');
  });
});
