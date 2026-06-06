import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://api.pinterest.com/v5';

function auth() {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) throw new Error('PINTEREST_ACCESS_TOKEN not set');
  return { Authorization: `Bearer ${token}` };
}

// GET /api/pinterest — fetch user's boards
export async function GET() {
  try {
    const res = await fetch(`${BASE}/boards?page_size=50`, {
      headers: auth(),
      cache: 'no-store',
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `Pinterest ${res.status}: ${txt}` }, { status: res.status });
    }
    const data = await res.json();
    // data.items = [{ id, name, description, ... }]
    return NextResponse.json({ boards: data.items ?? [] });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// POST /api/pinterest — create a pin
// Body: { board_id, title, description, link, image_url, publish_at? }
export async function POST(req: NextRequest) {
  try {
    const { board_id, title, description, link, image_url, publish_at } = await req.json();

    if (!board_id || !title || !image_url) {
      return NextResponse.json({ error: 'board_id, title, and image_url are required' }, { status: 400 });
    }

    const body: Record<string, unknown> = {
      board_id,
      title,
      description,
      link,
      media_source: { source_type: 'image_url', url: image_url },
    };

    // publish_at must be at least 5 minutes in the future (Pinterest requirement)
    if (publish_at) body.publish_at = publish_at;

    const res = await fetch(`${BASE}/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `Pinterest ${res.status}: ${txt}` }, { status: res.status });
    }

    const pin = await res.json();
    return NextResponse.json({ pin });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
