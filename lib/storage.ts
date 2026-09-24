/**
 * safeSetItem — localStorage wrapper that auto-purges stale article data
 * when storage is full, then retries. Keeps the current article's data safe.
 *
 * Article keys follow the pattern: <stage>-<id>
 * e.g. outline-543, article-543, images-543, compose-543, shop-543, brief-543
 */
export function safeSetItem(key: string, value: string, currentId?: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full — purge stale keys from OTHER articles and retry
    const stageKeys = ['outline-', 'article-', 'images-', 'compose-', 'shop-', 'brief-'];
    const toDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const isArticleKey = stageKeys.some(prefix => k.startsWith(prefix));
      if (!isArticleKey) continue;
      // Keep the current article's keys, purge everything else
      if (currentId && k.endsWith(`-${currentId}`)) continue;
      toDelete.push(k);
    }

    toDelete.forEach(k => localStorage.removeItem(k));

    try {
      localStorage.setItem(key, value);
    } catch {
      // Still full after purge — give up silently, data stays in React state
    }
  }
}
