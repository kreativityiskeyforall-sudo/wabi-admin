// TEMPORARY DEBUG — delete after key mismatch is diagnosed
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const raw = process.env.AGENT_API_KEY ?? '';
  const trimmed = raw.trim();
  return NextResponse.json({
    envSet: raw.length > 0,
    rawLen: raw.length,
    trimmedLen: trimmed.length,
    // first+last 4 chars only — not enough to reconstruct the key
    prefix: trimmed.slice(0, 4),
    suffix: trimmed.slice(-4),
    hasLeadingSpace: raw !== raw.trimStart(),
    hasTrailingSpace: raw !== raw.trimEnd(),
  });
}
