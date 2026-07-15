import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

// ONE-TIME FIX: redistributes the 21 stacked images in the bedroom article
// to appear after their matching H3 heading instead of all after a single H2.

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const DOC_ID = 'f9fd8bb0-f93a-45a7-9db4-2983c2da43aa';

// 21 images currently stacked (in order = ideas 1-21)
const IMAGE_KEYS = [
  'db6ubtgv','k4uwreun','pwaevvt1','53oim8nk','7dw6cmj4','oyqhx1gd','x3g4ywmu',
  'c55k13mb','a2w0tdi4','7bbowjuq','nwn1h5v8','ejys2az9','jllf9smf','8ahdtykg',
  'uqf9iwle','a6lohuq0','q4rwg353','xamqmaaj','5j7senvs','g2v6sj7h','cy77ibgz',
];

// H3 _key values in order (Idea 1-21) — insert each image AFTER this key
const H3_KEYS = [
  'wbpsjdmr','k3xg5hd3','jz0wqktj','84j6y6wu','58icjnlg','5xzllugb','gn75ktrj',
  'gmbmr9zn','37wzaaa7','o2d5gi46','ewrtlw5w','ps3oos8r','of7jrbp0','y2qcix2y',
  '8flo81c2','er0i91eu','h08u8txy','z2855v10','6x8ugu5a','i0of7c63','sykoqjr0',
];

export async function GET() {
  // 1. Fetch the stacked images to preserve their asset refs and alt text
  const doc = await sanity.fetch<{ body: Array<{ _key: string; _type: string; alt?: string; asset?: { _ref: string } }> }>(
    `*[_id == $id][0] { body[_type == "image"] { _key, alt, asset } }`,
    { id: DOC_ID }
  );

  const imageMap = new Map(doc.body.map(b => [b._key, { alt: b.alt, assetRef: b.asset?._ref }]));

  // 2. Unset all 21 stacked images in one patch
  await sanity.patch(DOC_ID)
    .unset(IMAGE_KEYS.map(k => `body[_key=="${k}"]`))
    .commit();

  // 3. Insert each image after its H3, one at a time
  for (let i = 0; i < 21; i++) {
    const imgKey = IMAGE_KEYS[i];
    const h3Key  = H3_KEYS[i];
    const img    = imageMap.get(imgKey);
    if (!img?.assetRef) continue;

    await sanity.patch(DOC_ID)
      .insert('after', `body[_key=="${h3Key}"]`, [{
        _type: 'image',
        _key: imgKey,
        alt: img.alt ?? '',
        asset: { _type: 'reference', _ref: img.assetRef },
      }])
      .commit();
  }

  // 4. Trigger Cloudflare rebuild
  if (process.env.CLOUDFLARE_DEPLOY_HOOK) {
    await fetch(process.env.CLOUDFLARE_DEPLOY_HOOK, { method: 'POST' }).catch(() => {});
  }

  return NextResponse.json({ ok: true, message: '21 images redistributed. Cloudflare is rebuilding (~3 min).' });
}
