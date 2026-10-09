import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHealth } from '../client';

afterEach(() => vi.unstubAllGlobals());

describe('API client', () => {
  it('calls the same-origin API and forwards cancellation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    expect(await getHealth(controller.signal)).toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', { signal: controller.signal });
  });

  it('rejects HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(getHealth()).rejects.toThrow('API request failed (503)');
  });

  it('rejects an invalid response shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'unknown' })));
    await expect(getHealth()).rejects.toThrow('Invalid API response');
  });
});