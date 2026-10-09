import type { ApiErrorResponse, HealthResponse } from '../shared/api';
import { createAuth, type Env } from './auth';
import { handleClubApi } from './club-api';

function apiError(code: string, message: string, status: number, headers?: HeadersInit): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return Response.json(body, { status, headers });
}

export async function handleRequest(request: Request, env?: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/v1/health') {
    if (request.method !== 'GET') {
      return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405, { Allow: 'GET' });
    }
    const body: HealthResponse = { status: 'ok' };
    return Response.json(body);
  }
  if (pathname.startsWith('/api/auth/') || pathname === '/api/v1/clubs' || pathname.startsWith('/api/v1/clubs/')) {
    if (!env) return apiError('SERVICE_UNAVAILABLE', 'Application services are not configured.', 503);
    try {
      const auth = createAuth(env);
      if (pathname.startsWith('/api/auth/')) return auth.handler(request);
      return await handleClubApi(request, env, auth);
    } catch {
      return apiError('SERVICE_UNAVAILABLE', 'Application services are not configured.', 503);
    }
  }
  return apiError('NOT_FOUND', 'Route not found.', 404);
}

export default {
  fetch: handleRequest,
} satisfies ExportedHandler<Env>;