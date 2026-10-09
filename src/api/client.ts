import type { HealthResponse } from '../shared/api';

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', { signal });
  if (!response.ok) {
    throw new Error(`API request failed (${response.status}).`);
  }

  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null || !('status' in data) || data.status !== 'ok') {
    throw new Error('Invalid API response.');
  }
  return { status: data.status };
}