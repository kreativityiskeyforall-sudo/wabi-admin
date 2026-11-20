export function isAgentRequest(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const key = authHeader.slice(7).trim();
  const expected = process.env.AGENT_API_KEY?.trim();
  return !!(expected && key === expected);
}

// URL-path fallback: /api/mcp/<AGENT_API_KEY>
// Used when the client cannot set custom headers (e.g. claude.ai connector beta).
export function isAgentMcpPath(pathname: string): boolean {
  if (!pathname.startsWith('/api/mcp/')) return false;
  const pathKey = pathname.slice('/api/mcp/'.length).split('/')[0];
  const expected = process.env.AGENT_API_KEY?.trim(); // trim guards against Vercel copy-paste whitespace
  return !!(expected && pathKey.length > 0 && pathKey === expected);
}

// Routes the agent bearer token cannot call
export const AGENT_BLOCKED_ROUTES = [
  '/api/publish',
  '/api/edit-article',
  '/api/edit-product-items',
  '/api/update-content-bible',
  '/api/fix-bedroom-body',
  '/api/patch-existing-articles',
];
