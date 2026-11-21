import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAgentRequest, isAgentMcpPath, AGENT_BLOCKED_ROUTES } from '@/lib/agentAuth';

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/purge-cache'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // OAuth discovery paths: always 404 so claude.ai never attempts OAuth.
  // A 401 here would make claude.ai think OAuth is required and show "Sign-in required".
  if (pathname.startsWith('/.well-known/')) {
    return new NextResponse(null, { status: 404 });
  }

  // OPTIONS on any /api/mcp path must pass through unauthenticated for CORS preflight.
  if (pathname.startsWith('/api/mcp') && request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Upload slot: auth is the HMAC-signed token in the query string, not Bearer/cookie.
  // OPTIONS (CORS preflight) and PUT must both pass through unauthenticated.
  if (pathname === '/api/upload-slot' && (request.method === 'PUT' || request.method === 'OPTIONS')) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Agent auth: Bearer token header OR key embedded in /api/mcp/<key> URL path
  const authHeader = request.headers.get('authorization');
  if (isAgentRequest(authHeader) || isAgentMcpPath(pathname)) {
    const isBlocked = AGENT_BLOCKED_ROUTES.some(r => pathname.startsWith(r));
    if (isBlocked) {
      return NextResponse.json(
        { error: 'This action is not permitted for agent access.' },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  // /api/mcp/<key> path with wrong or missing key: 403 — never 401.
  // Any 401 on an MCP path causes claude.ai to attempt OAuth and show "Sign-in required".
  if (pathname.startsWith('/api/mcp/') && pathname.length > '/api/mcp/'.length) {
    return NextResponse.json(
      { error: 'Invalid or missing key in URL path. Use /api/mcp/<AGENT_API_KEY>.' },
      { status: 403 },
    );
  }

  // Human session cookie auth
  const token = request.cookies.get('wabi-auth')?.value;
  const expected = process.env.ADMIN_PASSWORD;

  if (!token || !expected || token !== expected) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
