import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const { type, title, headings, productBrief, wordCount } = await req.json();
  const targetWords = wordCount ?? (type === 'product-review' ? 1400 : type === 'roundup' ? 1600 : 1800);

  let prompt = '';

  if (type === 'editorial') {
    prompt = `You are an expert interior design writer for wabidecor.com, a Japandi and wabi-sabi home decor blog.

Write a complete, high-quality article based on this outline:

Title: ${title}

Headings and notes:
${headings.map((h: { level: string; text: string; note: string }) => `${h.level}: ${h.text}\nNote: ${h.note}`).join('\n\n')}

Writing rules:
- ~${targetWords} words total
- Tone: warm, editorial, knowledgeable — like a trusted friend who knows interiors well
- Each H2 section: 2-3 solid paragraphs, specific and actionable
- Open with a compelling 2-paragraph introduction (no H2)
- No fluff, no filler, every sentence earns its place
- Include specific product details, measurements, costs where relevant
- UK English spelling
- End with a short conclusion paragraph

Return ONLY the article text in markdown format. Use ## for H2 headings.`;

  } else if (type === 'product-review') {
    const p = productBrief;
    prompt = `You are an expert product reviewer for wabidecor.com, a Japandi and wabi-sabi home decor blog.

Write a complete, honest product review for:

Product: ${title}
Current price: ${p.currentPrice}
90-day low: ${p.low90}
90-day high: ${p.high90}
Amazon stars: ${p.stars} (${p.reviewCount} reviews)
Amazon URL: ${p.amazonUrl}
Editorial angle: ${p.angle}

Write a ~${targetWords} word review with these sections:
## Overview
## Design & Aesthetic
## Build Quality & Materials
## Japandi Fit: Does It Work?
## Price & Value
## Pros & Cons (use bullet points: ✓ for pros, ✕ for cons)
## Our Verdict

Rules:
- Honest, balanced, specific — not promotional
- Mention the price relative to its 90-day range (good time to buy or wait?)
- 4-5 bullet pros, 2-3 bullet cons
- End verdict with a clear recommendation sentence
- UK English spelling
- Return ONLY the article in markdown`;

  } else if (type === 'roundup') {
    const products = productBrief.products;
    prompt = `You are an expert interior design writer for wabidecor.com, a Japandi and wabi-sabi home decor blog.

Write a product roundup article:

Title: ${title}

Products to include:
${products.map((p: { name: string; currentPrice: string; stars: string; angle: string }, i: number) => `${i + 1}. ${p.name} — £${p.currentPrice} — ${p.stars}★ — ${p.angle}`).join('\n')}

Write ~${targetWords} words. Structure:
- Introduction (2 paragraphs, no heading)
## How We Chose
## The Best [Category] — Our Picks (then number each product as ### 1. Product Name)
For each product: 2-3 paragraphs covering design, quality, value, japandi fit
## Final Thoughts

Rules:
- Helpful, editorial, honest
- Each product section mentions its current price
- UK English spelling
- Return ONLY the article in markdown`;
  }

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const article = message.content[0].type === 'text' ? message.content[0].text : '';

  return NextResponse.json({ article });
}
