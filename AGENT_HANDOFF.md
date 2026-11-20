# AGENT_HANDOFF.md — decoreixy Content Admin API

This document describes the wabi-admin system at `https://wabi-admin.vercel.app` for external AI agents automating article creation.

---

## 0. MCP Connector (Recommended for Claude.ai)

The admin exposes a remote MCP server at:

```
https://wabi-admin.vercel.app/api/mcp
```

**Add in claude.ai:** Settings → Connectors → Add custom connector → enter the URL above.

**Auth:** `Authorization: Bearer <AGENT_API_KEY>` on every request.

**15 available tools:**
`list_queue`, `get_queue_item`, `validate_outline`, `generate_outline`, `write_article`, `save_draft`, `update_draft`, `list_drafts`, `get_draft`, `upload_image`, `attach_image_to_draft`, `set_shop_blocks`, `set_sheet_status`, `get_site_articles`, `read_price_chart`

**No `publish` tool.** Drafts must be published by a human from the Drafts for Review page at `https://wabi-admin.vercel.app/drafts`.

---

## 1. Authentication

### Human sessions (browser)
**Method:** Cookie-based session (`wabi-auth` cookie).

```
POST /api/auth
Content-Type: application/json

{ "password": "<ADMIN_PASSWORD env var value>" }
```
Response: sets `wabi-auth` httpOnly cookie (7-day TTL).

### Agent API (MCP + direct API calls)
**Method:** Bearer token in Authorization header.

```
Authorization: Bearer <AGENT_API_KEY>
```

The `AGENT_API_KEY` env var value is set in Vercel. The agent uses this for all requests including the MCP connector. No cookie required.

**Routes blocked for agent Bearer token (returns 403):**
- `POST /api/publish`
- `POST /api/edit-article`
- `POST /api/edit-product-items`
- `POST /api/update-content-bible`
- `POST /api/fix-bedroom-body`
- `POST /api/patch-existing-articles`
- `PATCH /api/sheets` with `status: "published"`

**Public routes (no auth required):**
- `POST /api/auth`
- `POST /api/purge-cache` (Sanity webhook only, signature-verified)

---

## 2. Article Queue (Google Sheets)

Articles are queued in a Google Sheet before entering the pipeline.

### Get all queued articles
```
GET /api/sheets
```
Response:
```json
{
  "articles": [
    {
      "id": "557",
      "title": "13 Christmas Kitchen Decor Ideas...",
      "type": "editorial",
      "category": "Japandi — Bedroom",
      "cluster": "japandi-bedroom",
      "articleType": "ideas",
      "pinterestTitle": "...",
      "contentType": "ideas",
      "uniqueAngle": "...",
      "competition": "medium",
      "status": "queued",
      "priority": "high",
      "slug": "",
      "publishedAt": "",
      "rowNumber": 12
    }
  ]
}
```

**Article `type` values:** `"editorial"` | `"product-review"` | `"roundup"`  
**Article `status` values:** `"queued"` | `"published"` | `"delete"`

### Update article status in sheet
```
PATCH /api/sheets
Content-Type: application/json

{
  "tab": "Japandi — Bedroom",
  "rowNumber": 12,
  "status": "published",
  "slug": "13-christmas-kitchen-decor-ideas",
  "publishedAt": "2026-11-19T10:00:00Z"
}
```

---

## 3. Outline Generation

Generates a deduplicated H1/H2/H3 outline with SEO title and meta description. Checks the content bible for duplicate concepts.

```
POST /api/outline
Content-Type: application/json

{
  "title": "13 Christmas Kitchen Decor Ideas That Make the Season Feel Real",
  "contentType": "ideas",
  "category": "Seasonal — Christmas + Winter",
  "cluster": "christmas-decor",
  "uniqueAngle": "focus only on permanent kitchen items, not temporary decorations",
  "competition": "medium",
  "priority": "high"
}
```

**Response:** Streamed plain text, then a JSON block at the end:
```json
{
  "headings": [
    { "level": "H1", "text": "13 Christmas Kitchen...", "note": "Main title", "concept": "" },
    { "level": "H2", "text": "1. The Advent Calendar Counter", "note": "...", "concept": "advent-counter" },
    { "level": "H3", "text": "Choose One Surface Only", "note": "...", "concept": "" }
  ],
  "seoTitle": "13 Christmas Kitchen Decor Ideas...",
  "metaDescription": "Transform your kitchen this Christmas...",
  "contentBibleCheck": {
    "articleAlreadyExists": false,
    "rejectedH2Concepts": [],
    "rejectedH3Concepts": [],
    "cleanBill": true
  }
}
```

---

## 4. Article Writing

Generates full article markdown from an approved outline.

```
POST /api/write
Content-Type: application/json

{
  "type": "editorial",
  "title": "13 Christmas Kitchen Decor Ideas...",
  "headings": [
    { "level": "H2", "text": "1. The Advent Calendar Counter", "note": "One surface, one prop" }
  ],
  "wordCount": 1800,
  "uniqueAngle": "focus only on permanent kitchen items",
  "category": "Seasonal — Christmas + Winter",
  "cluster": "christmas-decor",
  "competition": "medium",
  "priority": "high",
  "contentType": "ideas"
}
```

For **product-review** type, also include:
```json
{
  "type": "product-review",
  "productBrief": {
    "angle": "Best Japandi bedroom furniture under $300",
    "products": [
      {
        "name": "Bamboo Platform Bed",
        "amazonUrl": "https://amazon.com/dp/B0XXXXXX?tag=oppositeattra-20",
        "brief": "Emphasise bamboo finish, Japandi fit, value vs premium rivals",
        "review": "",
        "imageUrls": "https://m.media-amazon.com/images/I/XXXXX.jpg",
        "priceNow": "189.99",
        "price90Low": "149.99",
        "price90High": "219.99",
        "stars": "4.4",
        "reviewCount": "2341",
        "priceHistory": [160,160,165,170,175,180,180,185,190,185,180,175,170,165,185,189.99]
      }
    ]
  }
}
```

**Response:**
```json
{ "article": "# 13 Christmas Kitchen Decor Ideas...\n\n..." }
```

The response is the complete article in **Markdown format**. Store this — it is the input to the publish step.

**Optional fields:**
- `brief` (string): full markdown brief to follow exactly (H2 structure, intro style, notes)
- `keywords` (array of strings): exact phrases that must appear naturally at least once each

**Writing rules enforced automatically:**
- Max 20 words per sentence
- American English (color, gray, cozy, center, favorite, organized, inches/feet)
- Prices in USD ($)
- Introduction always in first person ("I" or "we")
- All H2s numbered: "## 1. First Section", "## 2. Next Section"
- No markdown tables, no image placeholders, no `---` dividers
- Banned words: "elevate", "stunning", "timeless", "seamlessly", "effortlessly", "curated", etc.
- Ends with `## Frequently Asked Questions`

---

## 5. Image Generation

### Generate image prompts (Claude)
```
POST /api/generate-image-prompts
Content-Type: application/json

{
  "articleTitle": "13 Christmas Kitchen Decor Ideas...",
  "category": "seasonal",
  "headings": ["1. The Advent Calendar Counter", "2. The Ceramic Mug Display"],
  "articleMarkdown": "...",
  "includePins": false
}
```
Response: `{ "sectionPrompts": ["cinematic...", "cinematic..."] }` (array aligned to headings)

### Generate images (FLUX via fal.ai)
```
POST /api/generate-images
Content-Type: application/json

{
  "prompts": [
    {
      "prompt": "Cinematic interior photograph...",
      "model": "pro",
      "label": "1. The Advent Calendar Counter",
      "width": 1000,
      "height": 1500
    }
  ]
}
```
**Model options:** `"dev"` (fastest) | `"schnell"` | `"pro"` | `"ultra"` (highest quality)  
**Featured image:** use `"ultra"` at `1200×800`  
**Section images:** use `"pro"` at `1000×1500` (portrait 2:3)

Response: `{ "images": [{ "url": "https://fal.media/files/...", "label": "1. The Advent..." }] }`

### Upload image to Sanity CDN
```
POST /api/upload-image
Content-Type: multipart/form-data

file: <binary image file>
```
Response: `{ "url": "https://cdn.sanity.io/images/...", "assetId": "image-abc123-jpg" }`

---

## 6. Amazon Product Cards (Shop The Look)

Product cards are embedded mid-article after specific H2 sections. This is the "Shop The Look" system.

### Price curve generation (AI)
```
POST /api/generate-price-curve
Content-Type: application/json

{ "name": "Bamboo Platform Bed", "price": 189.99, "highPrice": 219.99 }
```
Response:
```json
{
  "history": [160,160,165,175,180,185,190,185,180,175,170,165,170,175,185,189.99],
  "low": 160,
  "high": 190,
  "badge": "low"
}
```

### Price curve from screenshot — MCP tool (recommended for agents)
Use the `read_price_chart` MCP tool. It accepts either a URL or base64, compresses large images automatically, and returns a clear error if the chart cannot be read rather than guessing.

```
tool: read_price_chart
{
  "imageUrl": "https://example.com/price-chart.png",  // OR imageBase64 + mediaType
  "price": 189.99,
  "name": "Bamboo Platform Bed"
}
```
Response: `{"history":[...20 values...],"low":149.99,"high":219.99,"badge":"low"}`

If the image is blurry, cropped, or not a price chart, the tool throws an error with a clear reason. **Never guess or fill in values.**

### Price curve from screenshot — direct API (legacy, pipeline UI)
```
POST /api/read-price-chart
Content-Type: application/json

{
  "imageBase64": "<base64 encoded PNG/JPEG of Amazon price chart>",
  "mediaType": "image/png",
  "price": 189.99,
  "name": "Bamboo Platform Bed"
}
```
Response: same shape as generate-price-curve.

### Shop block data format (for publish)
```json
{
  "shopBlocks": [
    {
      "afterHeading": "1. The Advent Calendar Counter",
      "headingLevel": "H2",
      "products": [
        {
          "name": "Bamboo Platform Bed",
          "amazonUrl": "https://amazon.com/dp/B0XXXXXX?tag=oppositeattra-20",
          "imageUrl": "https://m.media-amazon.com/images/I/XXXXX.jpg",
          "price": 189.99,
          "highPrice": 219.99,
          "stars": 4.4,
          "reviews": 2341,
          "low": 160,
          "high": 219.99,
          "priceHistory": [160,160,165,175,180,185,190,185,180,175,170,165,170,175,185,189.99],
          "badge": "low"
        }
      ]
    }
  ]
}
```
**Badge values:** `"low"` (at/near 1-year low) | `"rising"` (price going up) | `"pick"` (editor's pick) | `"stable"` (flat price)  
**Affiliate tag:** always append `?tag=oppositeattra-20` to Amazon URLs.  
**Max 3 products per shop block.**

---

## 7. Publishing an Article

This is the **final, irreversible step** that creates the article in Sanity CMS and makes it live on decoreixy.com.

```
POST /api/publish
Content-Type: application/json

{
  "title": "13 Christmas Kitchen Decor Ideas...",
  "slug": "13-christmas-kitchen-decor-ideas-that-make-the-season-feel-real",
  "body": "# 13 Christmas Kitchen...\n\n## 1. The Advent Calendar Counter\n\n...",
  "category": "seasonal",
  "type": "editorial",
  "cluster": "christmas-decor",
  "isMother": false,
  "featuredImageUrl": "https://fal.media/files/abc-featured.jpg",
  "sectionImages": [
    {
      "headingText": "1. The Advent Calendar Counter",
      "imageUrl": "https://fal.media/files/abc-section1.jpg",
      "altText": "A wooden advent calendar on a marble kitchen counter with cedar sprigs."
    }
  ],
  "shopBlocks": [],
  "productItems": [],
  "publishedAt": "2026-11-19T10:00:00Z"
}
```

**Required fields:** `title`, `slug`, `body`  
**`body`:** full article in Markdown. The route converts it to Sanity Portable Text automatically.  
**`category`:** lowercase website slug — e.g. `"japandi"`, `"coastal"`, `"seasonal"`, `"general"`, `"guides"`  
**`type`:** `"editorial"` | `"roundup"` | `"product-review"`

Response: `{ "id": "kLsEaYFa3mAxI05MnvkQxo", "slug": "13-christmas-kitchen..." }`

**After publish:**
- Call `PATCH /api/sheets` to mark the article as published in the queue
- Cloudflare Pages auto-rebuilds (~3 min) — the article goes live after the build

---

## 8. Saving as Draft (Agent workflow)

Agents use a Sanity-backed draft system. Drafts have `_id` starting with `drafts.` and are **never visible on decoreixy.com** until a human publishes them.

### Save a new draft
```
POST /api/save-draft
Authorization: Bearer <AGENT_API_KEY>
Content-Type: application/json

{
  "title": "13 Christmas Kitchen Decor Ideas...",
  "slug": "13-christmas-kitchen-decor-ideas",
  "body": "# Title\n\n## 1. The Advent Calendar Counter\n\n...",
  "category": "seasonal",
  "type": "editorial",
  "cluster": "christmas-decor",
  "isMother": false,
  "featuredImageUrl": "https://cdn.sanity.io/...",
  "sectionImages": [
    { "headingText": "1. The Advent Calendar Counter", "imageUrl": "https://cdn.sanity.io/...", "altText": "..." }
  ],
  "shopBlocks": [],
  "productItems": [],
  "rowNumber": 12,
  "sheetTab": "Seasonal — Christmas + Winter"
}
```
Response: `{ "id": "drafts.abc123", "slug": "13-christmas-kitchen..." }`

The `rowNumber` + `sheetTab` fields are optional — if provided, the sheet row is automatically marked `"drafted"`.

### Update a draft
```
POST /api/update-draft
Authorization: Bearer <AGENT_API_KEY>
Content-Type: application/json

{
  "id": "drafts.abc123",
  "title": "Updated title",
  "body": "Updated markdown...",
  "shopBlocks": [...]
}
```
Any subset of fields can be updated. `id` must start with `drafts.`.

### List all drafts
```
GET /api/drafts
Authorization: Bearer <AGENT_API_KEY>
```
Response: `{ "drafts": [ { "_id": "drafts.abc123", "title": "...", "category": "...", "_updatedAt": "..." } ] }`

### Get a single draft
```
GET /api/drafts/{draftId}
Authorization: Bearer <AGENT_API_KEY>
```
Response includes full body, images with assetUrl, shopBlocks, productItems.

### Delete a draft
```
DELETE /api/drafts/{draftId}
Authorization: Bearer <AGENT_API_KEY>
```

### Publish a draft (HUMAN ONLY — agent cannot call this)
Human opens `https://wabi-admin.vercel.app/drafts`, reviews the article, and clicks Publish. This calls `POST /api/publish-draft` which is blocked for agent Bearer tokens (403).

**To save article body to an already-published article** (edit mode):
```
POST /api/edit-article
Content-Type: application/json

{
  "id": "<sanity document _id>",
  "markdown": "Updated article body in markdown...",
  "existingImages": [
    {
      "headingText": "1. The Advent Calendar Counter",
      "headingStyle": "h2",
      "assetRef": "image-abc123-jpg",
      "alt": "..."
    }
  ]
}
```

**To update product items on a published article:**
```
POST /api/edit-product-items
Content-Type: application/json

{
  "id": "<sanity document _id>",
  "productItems": [
    {
      "name": "Bamboo Platform Bed",
      "amazonUrl": "https://...",
      "imageUrl": "https://...",
      "priceNow": "189.99",
      "price1yrLow": "149.99",
      "price1yrHigh": "219.99",
      "stars": "4.4",
      "reviewCount": "2341",
      "priceHistory": [160,160,165,175,180,185,190,185,180,175,170,165,170,175,185,189.99]
    }
  ]
}
```

---

## 9. Article Data Model (Sanity)

```typescript
{
  _type: "article",
  _id: string,                    // Sanity document ID (after publish)
  title: string,                  // Full article title
  slug: { _type: "slug", current: string },
  body: PortableTextBlock[],      // Article content (auto-converted from markdown)
  intro: string,                  // First 320 chars, auto-extracted
  pullQuote: string | null,       // Best sentence, auto-extracted
  kicker: string,                 // e.g. "Japandi · 9 min read"
  category: string,               // e.g. "japandi", "seasonal"
  type: "info" | "roundup" | "gift-guide",
  articleType: "editorial",
  cluster: string | null,         // Content cluster slug
  isMother: boolean,              // True if this is the master guide for a cluster
  featuredImage: { _type: "image", asset: { _type: "reference", _ref: string } } | null,
  publishedAt: string,            // ISO date string
  productItems: ProductItem[],    // For product-review articles
  shopBlocks: ShopBlock[]         // Shop The Look affiliate blocks
}
```

**ProductItem:**
```typescript
{
  _type: "productItem",
  name: string,
  amazonUrl: string,
  imageUrl: string,
  priceNow: string,
  price1yrLow: string,
  price1yrHigh: string,
  stars: string,
  reviewCount: string,
  priceHistory: number[16]        // Weekly step-function prices, oldest→newest
}
```

---

## 10. Slug Format

Slugs are auto-generated from the title:
```
title.toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
```
Example: `"13 Christmas Kitchen Decor Ideas!"` → `"13-christmas-kitchen-decor-ideas"`

The final URL is: `https://decoreixy.com/{category}/{slug}/`

---

## 11. Category Mapping

| Google Sheet tab | Website category slug |
|---|---|
| Japandi — Bedroom | `japandi` |
| Japandi — Living Room | `japandi` |
| Japandi — Kitchen | `japandi` |
| Japandi — Bathroom | `japandi` |
| Coastal — Bedroom | `coastal` |
| Coastal — Living Room | `coastal` |
| Modern Farmhouse — * | `modern-farmhouse` |
| Boho — * | `boho` |
| Scandinavian — * | `scandinavian` |
| Cottagecore — * | `cottagecore` |
| MCM — * | `mid-century-modern` |
| Seasonal — * | `seasonal` |
| General — * | `general` |
| Garden — * | `garden` |
| Guides | `guides` |
| Style Guides | `guides` |
| Mexican + Hacienda | `global-styles` |

---

## 12. Things an Agent MUST NOT Do

1. **Never call `POST /api/publish`.** This route is blocked (403) for agent Bearer tokens. Use `save_draft` instead. Only a human can publish from the Drafts for Review page.
2. **Never call `POST /api/publish-draft`.** Same — blocked for agents (403).
3. **Never delete live Sanity documents.** `DELETE /api/drafts/{id}` only deletes draft documents (ID starting with `drafts.`). Never call Sanity directly.
4. **Never update the Google Sheet status to `"published"`.** The agent can only set `"drafted"`. Attempting `"published"` returns 403.
5. **Never save the same draft twice with the same slug.** `save_draft` checks for an existing live article with the same slug and returns 409 if found.
6. **Never modify the content bible** (`POST /api/update-content-bible`) — it gates all future outline generation.
7. **Never use the fix-bedroom-body or patch-existing-articles routes** — these are one-time migration scripts.
8. **Never set `isMother: true`** unless explicitly designated as the master guide for a cluster.
9. **Never fabricate Amazon product data.** Price history, stars, review counts must come from real Amazon pages or the read-price-chart API.
10. **Always append `?tag=oppositeattra-20`** to every Amazon URL. The `save_draft` and `set_shop_blocks` routes enforce this automatically — but verify before calling.
11. **Never bypass the outline → write pipeline.** The outline checks the content bible to prevent duplicate concepts across the 597-article plan.
12. **Never use `generate-price-curve`** — it generates fabricated price data. Only `read-price-chart` (from a real Amazon screenshot) is acceptable.

---

## 13. Agent Pipeline Order (via MCP)

For a new article using the MCP connector:

```
1. list_queue                 — find the article in the queue
2. get_site_articles          — check for overlap with existing articles
3. validate_outline           — check proposed headings against content bible
4. generate_outline           — generate SEO outline
5. write_article              — generate markdown (returned only, not saved)
6. [review and edit markdown]
7. upload_image               — upload featured image to Sanity CDN
8. upload_image (×N)          — upload each section image
9. save_draft                 — save complete article as Sanity draft (sets sheet to "drafted")
10. attach_image_to_draft     — set featured image + each section image
11. set_shop_blocks           — add product cards (optional)
12. [human opens /drafts, reviews, clicks Publish]
```

**Article type values in this pipeline:**
- Input type: `"editorial"` | `"product-review"` | `"roundup"`
- Stored in Sanity as: `"info"` | `"roundup"` | `"gift-guide"` (mapped automatically by save-draft)

**Price field names:**
- In productBrief (write): `price90Low` / `price90High`
- In Sanity / productItems: `price1yrLow` / `price1yrHigh`
- Both are accepted by save-draft (normalized automatically)

---

## 14. Environment Variables Required

The following env vars must be set in Vercel for the admin to function. **Do not hardcode values.**

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Login password for the admin panel |
| `AGENT_API_KEY` | Bearer token for MCP and agent API access — **NEW** |
| `ANTHROPIC_API_KEY` | Claude API (outline, write, alt text generation) |
| `SANITY_PROJECT_ID` | Sanity project ID (`2t1zjo13`) |
| `SANITY_DATASET` | `production` |
| `SANITY_TOKEN` | Sanity write token |
| `FAL_KEY` | fal.ai key for FLUX image generation |
| `GOOGLE_SHEETS_ID` | Google Sheet ID for article queue |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account credentials (stringified JSON) |
| `CLOUDFLARE_ZONE_ID` | For cache purging after publish |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Cache Purge permission only) |
| `SANITY_WEBHOOK_SECRET` | Verifies incoming Sanity webhook signatures |

**New env var to add in Vercel:** `AGENT_API_KEY` — choose any strong random string (e.g. `openssl rand -hex 32`). This is the value you enter as the API key in claude.ai's custom connector settings.

**MCP connector URL for claude.ai:** `https://wabi-admin.vercel.app/api/mcp`
