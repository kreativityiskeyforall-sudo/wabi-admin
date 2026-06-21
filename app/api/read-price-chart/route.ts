import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const { imageBase64, mediaType, price, name } = await req.json();
  if (!imageBase64 || !price) {
    return NextResponse.json({ error: 'imageBase64 and price required' }, { status: 400 });
  }

  const currentPrice = Number(price);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: (mediaType ?? 'image/png') as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: `This is a price history chart from Amazon for "${name || 'a product'}" currently priced at $${currentPrice}.

Extract exactly 16 price data points from this chart, reading left to right across the full time period shown.

Rules:
- Match the step-function pattern exactly (sudden vertical jumps, flat plateaus — NOT gradual curves)
- The 16th (last) value MUST be exactly ${currentPrice}
- Read the Y-axis labels to get accurate price values
- Return ONLY valid JSON, nothing else

{"history":[n1,n2,...,n16],"low":<lowest_price_visible>,"high":<highest_price_visible>}`,
        },
      ],
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();

  let parsed: { history: number[]; low: number; high: number };
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match?.[0] ?? raw);
  } catch {
    return NextResponse.json({ error: 'Could not parse chart data from image' }, { status: 500 });
  }

  const history: number[] = parsed.history;
  if (!Array.isArray(history) || history.length < 2) {
    return NextResponse.json({ error: 'Invalid chart data returned' }, { status: 500 });
  }

  // Enforce last value = current price
  history[history.length - 1] = currentPrice;

  const low = parsed.low ?? Math.min(...history);
  const high = parsed.high ?? Math.max(...history);
  const minVal = Math.min(...history);
  const maxVal = Math.max(...history);

  // Badge logic
  let badge: 'low' | 'rising' | 'pick' = 'pick';
  const pct = (currentPrice - minVal) / (maxVal - minVal || 1);
  if (pct <= 0.10) {
    badge = 'low';
  } else {
    const last3 = history.slice(-3);
    const sorted = [...history].sort((a, b) => b - a);
    const secondHighest = sorted[1] ?? maxVal;
    if (last3.every(v => v >= secondHighest * 0.97)) badge = 'rising';
  }

  return NextResponse.json({ history, low, high, badge });
}
