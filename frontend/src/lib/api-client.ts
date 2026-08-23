export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Every fetch backing this ref stays outside React's render cycle. */
let isRefreshing: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  isRefreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      isRefreshing = null;
    });

  return isRefreshing;
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(response.status, 'Unexpected server response');
  }
}

/**
 * Thin fetch wrapper around the backend's `{success,message,data}` envelope.
 * `credentials: 'include'` is required for the httpOnly auth cookies to be
 * sent; same-origin in both dev (Vite's proxy) and production (one process
 * serves both), so this never needs an absolute base URL.
 *
 * On a 401 from anything other than /auth/refresh itself, transparently
 * retries once after a refresh — the access token is short-lived (15 min) by
 * design, so this keeps a still-valid session from interrupting the user.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers:
      options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...options.headers },
  });

  if (response.status === 401 && !_isRetry && path !== '/auth/refresh') {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
  }

  const envelope = await parseEnvelope<T>(response);

  if (!response.ok) {
    throw new ApiError(response.status, envelope.message);
  }

  return envelope.data;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
