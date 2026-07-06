import { NextRequest, NextResponse } from 'next/server';
import * as fal from '@fal-ai/serverless-client';

fal.config({ credentials: process.env.FAL_KEY! });

type ImageRequest = {
  prompt: string;
  model: 'dev' | 'schnell' | 'pro' | 'ultra';
  label: string;
  width?: number;
  height?: number;
};

type FalResult = {
  images: Array<{ url: string }>;
};

function toAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
}

async function generateOne(item: ImageRequest): Promise<{ url: string; label: string }> {
  const w = item.width ?? 1000;
  const h = item.height ?? 1500;

  let modelId: string;
  let input: Record<string, unknown>;

  if (item.model === 'ultra') {
    modelId = 'fal-ai/flux-pro/v1.1-ultra';
    input = {
      prompt: item.prompt,
      aspect_ratio: toAspectRatio(w, h),
      num_images: 1,
      enable_safety_checker: false,
      output_format: 'jpeg',
    };
  } else if (item.model === 'pro') {
    modelId = 'fal-ai/flux-pro/v1.1';
    input = {
      prompt: item.prompt,
      image_size: { width: w, height: h },
      num_images: 1,
      enable_safety_checker: false,
      output_format: 'jpeg',
    };
  } else if (item.model === 'dev') {
    modelId = 'fal-ai/flux/dev';
    input = {
      prompt: item.prompt,
      image_size: { width: w, height: h },
      num_images: 1,
      enable_safety_checker: false,
    };
  } else {
    modelId = 'fal-ai/flux/schnell';
    input = {
      prompt: item.prompt,
      image_size: { width: w, height: h },
      num_images: 1,
      enable_safety_checker: false,
    };
  }

  const result = await fal.run(modelId, { input }) as FalResult;
  return { url: result.images[0].url, label: item.label };
}

// Run prompts in batches to avoid timeouts with large section lists
async function generateInBatches(prompts: ImageRequest[], batchSize = 3) {
  const results: Array<{ url: string; label: string }> = [];
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(generateOne));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(req: NextRequest) {
  const { prompts }: { prompts: ImageRequest[] } = await req.json();

  if (!prompts?.length) {
    return NextResponse.json({ error: 'No prompts provided' }, { status: 400 });
  }

  try {
    const results = await generateInBatches(prompts, 3);
    return NextResponse.json({ images: results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
