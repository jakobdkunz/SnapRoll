import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  const requestedMethod = request.headers.get('access-control-request-method');
  const requestedHeaders = request.headers.get('access-control-request-headers');
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    requestedMethod || 'GET,POST,PATCH,PUT,DELETE,OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    requestedHeaders || 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma'
  );
  response.headers.set('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
