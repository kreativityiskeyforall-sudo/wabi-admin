export function isAgentRequest(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const key = authHeader.slice(7);
  const expected = process.env.AGENT_API_KEY;
  return !!(expected && key === expected);
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
