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
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
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
          text: `This is a 1-year Amazon price history chart for "${name || 'a product'}". The current price is ${currentPrice}.

STEP 1 — Read the Y-axis:
Look at the horizontal grid lines and their labels on the Y-axis. Note the exact dollar values (e.g. $90, $110, $130, $150, $170). These are your reference points.

STEP 2 — Read the chart left to right:
The chart is a step-function (flat horizontal lines with sudden vertical drops/jumps). Trace every price level plateau carefully from left (oldest) to right (newest/today).

STEP 3 — Extract 20 price points:
Sample 20 evenly-spaced points left to right. For each point, estimate the price by comparing its vertical position against the Y-axis labels. BE PRECISE — if a plateau sits halfway between $110 and $130 labels, write $120.

CRITICAL RULES:
- "low" = the LOWEST price the line ever touches in the chart. This is often NOT the current price. Look for the deepest dip.
- "high" = the HIGHEST price the line ever reaches. Look for the tallest plateau.
- The 20th (last) value MUST be exactly ${currentPrice}.
- Never invent values — read directly from the chart's Y-axis scale.
- Do NOT set low = current price unless the current price is genuinely the lowest point on the whole chart.

Return ONLY this JSON, nothing else:
{"history":[v1,v2,...,v20],"low":<true minimum seen>,"high":<true maximum seen>}`,
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

  // Use model-reported low/high but sanity-check against history
  const histMin = Math.min(...history);
  const histMax = Math.max(...history);
  const low = Math.min(parsed.low ?? histMin, histMin);
  const high = Math.max(parsed.high ?? histMax, histMax);

  // Badge logic
  const pct = (currentPrice - low) / (high - low || 1);
  let badge: 'low' | 'rising' | 'pick' = 'pick';
  if (pct <= 0.15) {
    badge = 'low';
  } else {
    const last4 = history.slice(-4);
    const sorted = [...history].sort((a, b) => b - a);
    const secondHighest = sorted[1] ?? high;
    if (last4.every(v => v >= secondHighest * 0.97)) badge = 'rising';
  }

  return NextResponse.json({ history, low, high, badge });
}
