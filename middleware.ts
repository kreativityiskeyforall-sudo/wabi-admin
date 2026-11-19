import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAgentRequest, AGENT_BLOCKED_ROUTES } from '@/lib/agentAuth';

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/purge-cache'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Agent Bearer-token auth (used by MCP connector and direct API access)
  const authHeader = request.headers.get('authorization');
  if (isAgentRequest(authHeader)) {
    const isBlocked = AGENT_BLOCKED_ROUTES.some(r => pathname.startsWith(r));
    if (isBlocked) {
      return NextResponse.json(
        { error: 'This action is not permitted for agent access.' },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  // Human session cookie auth
  const token = request.cookies.get('wabi-auth')?.value;
  const expected = process.env.ADMIN_PASSWORD;

  if (!token || !expected || token !== expected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
