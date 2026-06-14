import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password, action } = await req.json();

  if (action === 'logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('wabi-auth', '', { maxAge: 0, path: '/' });
    return res;
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  if (password !== expected) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('wabi-auth', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}
