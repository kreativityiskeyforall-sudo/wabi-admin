import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { articleTitle, category, headings } = await req.json();

  if (!headings?.length) return NextResponse.json({ error: 'No headings provided' }, { status: 400 });

  const categoryNames: Record<string, string> = {
    bedroom: 'Japandi bedroom',
    'living-room': 'Japandi living room',
    bathroom: 'Japandi bathroom',
    kitchen: 'Japandi kitchen',
  };
  const roomType = categoryNames[category] ?? 'Japandi interior';

  const prompt = `You are an expert at writing AI image generation prompts for FLUX (a photorealistic AI image model) for a Japandi and wabi-sabi interior design blog called wabidecor.com.

Article title: "${articleTitle}"
Room type: ${roomType}

I need one detailed image prompt for each of these article section headings. Each prompt must:
- Describe a SPECIFIC interior scene with concrete objects, not abstract concepts
- Include specific materials: pale oak, linen, matte ceramic, rattan, bamboo, stone, natural textures
- Include specific lighting: golden morning light, diffused afternoon sun, soft north light, etc.
- Include camera angle: eye-level, low angle from floor, overhead, three-quarter room view, close-up detail
- Include mood: serene, meditative, quiet, wabi-sabi imperfection
- End with: "editorial interior photography, 35mm lens, natural light"
- Be 1–2 sentences, around 40–60 words
- Do NOT repeat the heading text verbatim — translate it into a visual scene
- Skip abstract or non-visual headings (FAQ, conclusion, intro) and write a beautiful Japandi scene anyway

Headings:
${headings.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}

Return ONLY a JSON array of strings, one prompt per heading, in the same order. No explanation, no keys, just the array.
Example format: ["prompt for heading 1", "prompt for heading 2"]`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';

  try {
    const prompts = JSON.parse(text.trim());
    return NextResponse.json({ prompts });
  } catch {
    // Try to extract JSON array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return NextResponse.json({ prompts: JSON.parse(match[0]) });
    }
    return NextResponse.json({ error: 'Failed to parse prompts', raw: text }, { status: 500 });
  }
}
