import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { title, type, category, keywords } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const prompt = `You are an expert interior design content strategist for wabidecor.com, a Japandi and wabi-sabi home decor blog.

Generate an SEO-optimised article outline for the following:

Title: ${title}
Type: ${type}
Category: ${category}
${keywords ? `Keywords to target: ${keywords}` : ''}

Return a JSON object with this exact structure:
{
  "seoTitle": "...",        // 50-60 chars, keyword near start
  "metaDescription": "...", // 140-160 chars, compelling, includes keyword
  "estimatedWords": 1800,
  "headings": [
    { "level": "H1", "text": "...", "note": "..." },
    { "level": "H2", "text": "...", "note": "..." }
  ]
}

Rules:
- H1 must match the SEO title exactly
- Include 8-12 H2 sections for editorial, 6-8 for hacks/ideas lists
- Each H2 note explains what the section covers (1 short line)
- Writing tone: warm, editorial, knowledgeable — like a trusted friend who knows interiors
- No fluff, no padding, every section must earn its place
- Return ONLY the JSON, no markdown wrapping`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const outline = JSON.parse(text);

  return NextResponse.json(outline);
}
