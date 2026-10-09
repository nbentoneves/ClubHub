import { describe, expect, it } from 'vitest';
import { handleRequest } from '../index';

describe('Worker API', () => {
  it('returns a health response', async () => {
    const response = handleRequest(new Request('https://example.test/api/v1/health'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('rejects unsupported methods', async () => {
    const response = handleRequest(new Request('https://example.test/api/v1/health', { method: 'POST' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    expect(await response.json()).toEqual({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' },
    });
  });

  it('returns a JSON error for unknown routes', async () => {
    const response = handleRequest(new Request('https://example.test/api/v1/missing'));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    });
  });
});