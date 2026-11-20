// Post-processing applied to all article markdown after /api/write and before saving to Sanity.
// Three rules:
//   1. Remove lines that are only horizontal rules (--- or ***)
//   2. Strip links to competitor domains — keep anchor text, remove the URL
//   3. Add trailing slash to decoreixy.com internal links that lack one

const COMPETITOR_DOMAINS = new Set([
  'architecturaldigest.com',
  'housebeautiful.com',
  'apartmenttherapy.com',
  'bhg.com',
  'dezeen.com',
  'elledecor.com',
  'veranda.com',
  'domino.com',
  'thespruce.com',
  'hgtv.com',
]);

export function cleanArticleText(text: string): string {
  if (!text) return text;

  // 1. Drop lines that are only --- or *** (any length, with optional surrounding whitespace)
  let result = text
    .split('\n')
    .filter(line => !/^\s*-{3,}\s*$/.test(line) && !/^\s*\*{3,}\s*$/.test(line))
    .join('\n');

  // 2. Competitor links → plain anchor text
  //    [anchor text](https://dezeen.com/article) → anchor text
  result = result.replace(
    /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,
    (match, anchorText, url) => {
      try {
        const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
        return COMPETITOR_DOMAINS.has(host) ? anchorText : match;
      } catch {
        return match; // malformed URL — leave unchanged
      }
    },
  );

  // 3. Trailing slash on decoreixy.com internal links
  //    Skip: already ends with /, has query string, has fragment, ends with file extension
  result = result.replace(
    /\((https:\/\/decoreixy\.com\/[^)\s]+)\)/g,
    (_, url) => {
      if (url.endsWith('/')) return `(${url})`;
      if (/[?#]/.test(url)) return `(${url})`;
      if (/\.[a-zA-Z]{2,5}$/.test(url)) return `(${url})`;
      return `(${url}/)`;
    },
  );

  return result;
}
