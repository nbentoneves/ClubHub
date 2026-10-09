export type HealthResponse = { status: 'ok' };

export type ApiErrorResponse = {
  error: { code: string; message: string };
};