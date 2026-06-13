import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const ALLOWED_ORIGINS = [
  'https://decoreixy.com',
  'https://www.decoreixy.com',
  'http://localhost:4322',
  'http://localhost:4323',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  try {
    const body = await req.json();
    const { articleSlug, articleTitle, name, email, body: commentBody } = body;

    if (!articleSlug || !name || !email || !commentBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
    }

    if (commentBody.length > 2000) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400, headers });
    }

    // Save comment to Sanity with status "pending"
    const doc = await sanity.create({
      _type: 'comment',
      articleSlug,
      articleTitle: articleTitle || articleSlug,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      body: commentBody.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Send email notification if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Decoreixy Comments <onboarding@resend.dev>',
          to: ['decoreixy@gmail.com'],
          subject: `New comment on "${articleTitle || articleSlug}"`,
          html: `
            <h2>New comment awaiting moderation</h2>
            <p><strong>Article:</strong> ${articleTitle || articleSlug}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Comment:</strong></p>
            <blockquote>${commentBody}</blockquote>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://wabi-admin.vercel.app'}/comments">Review in admin panel →</a></p>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true, id: doc._id }, { headers });
  } catch (err) {
    console.error('Comment API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers });
  }
}
