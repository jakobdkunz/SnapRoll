import { z } from 'zod';

export function getApiBaseUrl() {
  // Check if we're running on a tunneled URL and use the tunneled API URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('loca.lt')) {
      // Use a hardcoded tunnel URL that we know works
      return 'https://nine-baths-appear.loca.lt';
    }
  }
  
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { schema?: z.ZodType<T> } = {}
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const init: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
