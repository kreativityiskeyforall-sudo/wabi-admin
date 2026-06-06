import { NextRequest, NextResponse } from 'next/server';
import * as fal from '@fal-ai/serverless-client';

fal.config({ credentials: process.env.FAL_KEY! });

type ImageRequest = {
  prompt: string;
  model: 'dev' | 'schnell';
  label: string;
};

type FalResult = {
  images: Array<{ url: string }>;
};

export async function POST(req: NextRequest) {
  const { prompts }: { prompts: ImageRequest[] } = await req.json();

  if (!prompts?.length) {
    return NextResponse.json({ error: 'No prompts provided' }, { status: 400 });
  }

  const results = await Promise.all(
    prompts.map(async (item) => {
      const modelId = item.model === 'dev' ? 'fal-ai/flux/dev' : 'fal-ai/flux/schnell';
      const result = await fal.run(modelId, {
        input: {
          prompt: item.prompt,
          image_size: { width: 1000, height: 1500 },
          num_images: 1,
          enable_safety_checker: false,
        },
      }) as FalResult;
      return { url: result.images[0].url, label: item.label };
    })
  );

  return NextResponse.json({ images: results });
}
