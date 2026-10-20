import type { GenerationRequest, Program, WebState } from './types';
const TOKEN_KEY = 'aigym.web.session';
const USER_KEY = 'aigym.web.user';
export const getToken = () =>
  typeof sessionStorage === 'undefined'
    ? null
    : sessionStorage.getItem(TOKEN_KEY);
export const getCachedUserId = () =>
  typeof sessionStorage === 'undefined'
    ? null
    : sessionStorage.getItem(USER_KEY);
export function setAuth(token: string, userId: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, userId);
}
export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
function baseUrl() {
  return (
    process.env.EXPO_PUBLIC_LOCAL_API_URL ||
    (typeof window !== 'undefined' &&
    ['8093', '8081'].includes(window.location.port)
      ? `http://${window.location.hostname}:8094`
      : '')
  );
}
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${baseUrl()}${path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`}`,
      {
        ...options,
        signal: options.signal ?? controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      },
    );
    const data: unknown = await response.json();
    if (!response.ok) {
      const error = data as { error?: string; message?: string };
      throw new ApiError(
        error.error ?? error.message ?? 'The request could not be completed.',
        response.status,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'Cannot reach your local workspace. Your pending workout stays on this device; reconnect and retry.',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
async function forCurrentAccount<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const result = await apiRequest<T>(path, options);
  if (!token || getToken() !== token)
    throw new ApiError(
      'Your session changed. Try again in the correct account.',
      401,
    );
  return result;
}
export function generatePlan(
  request: GenerationRequest,
): Promise<{ program: Program; provider: 'local-template' }> {
  return forCurrentAccount('/api/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
export function exportAccount(): Promise<Record<string, unknown>> {
  return forCurrentAccount('/api/export');
}
export function cacheState(state: WebState) {
  try {
    localStorage.setItem(
      `aigym.web.cache.${state.user.id}`,
      JSON.stringify(state),
    );
  } catch {
    /* API remains authoritative if browser storage is full. */
  }
}
export function readCachedState(): WebState | null {
  try {
    const id = getCachedUserId();
    return id
      ? (JSON.parse(
          localStorage.getItem(`aigym.web.cache.${id}`) ?? 'null',
        ) as WebState | null)
      : null;
  } catch {
    return null;
  }
}
