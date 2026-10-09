import type { ApiErrorResponse, HealthResponse } from '../shared/api';

function apiError(code: string, message: string, status: number, headers?: HeadersInit): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return Response.json(body, { status, headers });
}

export function handleRequest(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/v1/health') {
    if (request.method !== 'GET') {
      return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405, { Allow: 'GET' });
    }
    const body: HealthResponse = { status: 'ok' };
    return Response.json(body);
  }
  return apiError('NOT_FOUND', 'Route not found.', 404);
}

export default {
  fetch: handleRequest,
} satisfies ExportedHandler;