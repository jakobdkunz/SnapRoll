import { z } from 'zod';

export function getApiBaseUrl() {
  // Prefer special handling for localtunnel during local testing
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('loca.lt')) {
      return 'https://nine-baths-appear.loca.lt';
    }
  }

  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    // If protocol is missing, default to https
    return `https://${trimmed}`;
  }

  return 'http://localhost:3002';
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { schema?: z.ZodType<T> } = {}
): Promise<T> {
  const base = getApiBaseUrl();
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const cacheBuster = isGet ? `${path.includes('?') ? '&' : '?'}t=${Date.now()}` : '';
  const url = `${base}${path}${cacheBuster}`;
  const init: RequestInit = {
    ...options,
    // Prevent browser/SW caching
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      ...(typeof window !== 'undefined' ? { 'X-TZ-Offset': String(new Date().getTimezoneOffset()) } : {}),
      ...(options.headers || {}),
    },
  };
  const res = await fetch(url, init);
  if (!res.ok) {
    let bodyText: string | null = null;
    try {
      bodyText = await res.text();
    } catch {
      bodyText = null;
    }
    if (bodyText && bodyText.length > 0) {
      let message: string | undefined;
      try {
        const parsed = JSON.parse(bodyText) as { error?: string; message?: string };
        message = parsed.error || parsed.message;
      } catch {
        // Not JSON
      }
      throw new Error(message || bodyText);
    }
    throw new Error(`Request failed: ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  if (options.schema) {
    return options.schema.parse(data);
  }
  return data as T;
}
