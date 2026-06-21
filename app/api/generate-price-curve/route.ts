import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { name, price, highPrice } = await req.json();
  if (!price) return NextResponse.json({ error: 'price required' }, { status: 400 });

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Generate a realistic Amazon price history for a home decor product.

Product: ${name || 'Home decor item'}
Current price: $${price}
${highPrice ? `Highest known price: $${highPrice}` : ''}

Rules:
1. Return exactly 16 weekly price points (index 0 = oldest, index 15 = most recent/current)
2. CRITICAL: Prices MUST use sudden step-changes — flat plateaus then abrupt jumps. NO gradual changes. Example: [55,55,55,89,89,89,55,55,55,89,89,55,55,55,55,${price}]
3. Index 15 (last value) MUST equal ${price} exactly
4. Use 2–4 distinct price levels only
5. Each plateau: 2–5 consecutive identical values before any jump
6. If highPrice given ($${highPrice || 'N/A'}), include it as one of the price levels
7. Price swing: realistic Amazon range, usually 30–60% from low to high

Return ONLY valid JSON, no explanation:
{"history":[16 numbers],"low":number,"high":number,"badge":"low"|"rising"|"pick"}

Badge: "low" if current price is within 10% of minimum. "rising" if last 3 values are all at/above second-highest level. "pick" otherwise.`,
    }],
  });

  const text = (msg.content[0] as any).text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'No JSON' }, { status: 500 });

  const data = JSON.parse(jsonMatch[0]);
  // Enforce last value = current price
  if (Array.isArray(data.history) && data.history.length === 16) {
    data.history[15] = price;
    data.low = Math.min(...data.history);
    data.high = Math.max(...data.history);
  }
  return NextResponse.json(data);
}
