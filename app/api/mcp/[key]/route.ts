// URL-path auth fallback for MCP clients that cannot set custom headers.
// Usage: POST/GET https://wabi-admin.vercel.app/api/mcp/<AGENT_API_KEY>
// Identical behaviour to /api/mcp — the key is validated in the handler.
import { NextRequest, NextResponse } from 'next/server';
import { isAgentMcpPath } from '@/lib/agentAuth';
import { POST as mcpPost, GET as mcpGet, OPTIONS as mcpOptions } from '../route';

export const maxDuration = 300;

function authorized(req: NextRequest, key: string): NextRequest {
  // Inject a Bearer header so the shared MCP handler sees a valid agent request
  const headers = new Headers(req.headers);
  headers.set('authorization', `Bearer ${process.env.AGENT_API_KEY}`);
  return new Request(req.url, {
    method: req.method,
    headers,
    body: req.body,
    // @ts-expect-error duplex required for streaming body in Node
    duplex: 'half',
  }) as unknown as NextRequest;
}

function validateKey(req: NextRequest): boolean {
  return isAgentMcpPath(new URL(req.url).pathname);
}

export async function POST(req: NextRequest, { params }: { params: { key: string } }) {
  if (!validateKey(req)) {
    // 403 not 401 — a 401 triggers claude.ai OAuth discovery ("Sign-in required")
    return NextResponse.json({ jsonrpc: '2.0', error: { code: -32001, message: 'Invalid key' } }, { status: 403 });
  }
  return mcpPost(authorized(req, params.key));
}

export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  if (!validateKey(req)) {
    return new NextResponse('Invalid key', { status: 403 });
  }
  return mcpGet(authorized(req, params.key));
}

// HEAD: used by some connectors to probe the endpoint
export async function HEAD(req: NextRequest) {
  if (!validateKey(req)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 200 });
}

export async function OPTIONS() {
  return mcpOptions();
}
