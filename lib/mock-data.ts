import type { Article, PinterestBoard } from './types';

export const MOCK_ARTICLES: Article[] = [
  { id: '1', title: '23 Japandi Living Room Ideas That Feel Instantly Calm', type: 'ideas', category: 'Living Room', status: 'writing', cluster: 'Ultimate Japandi Living Room Guide', priority: 1 },
  { id: '2', title: '15 Japandi Living Room DIY Hacks That Cost Almost Nothing', type: 'hacks', category: 'Living Room', status: 'outline-ready', cluster: 'Ultimate Japandi Living Room Guide', priority: 2 },
  { id: '3', title: 'Artiss Bookshelf Bamboo 5 Tier Review', type: 'product-review', category: 'Living Room', status: 'outline-ready', priority: 3, amazonUrl: 'https://amazon.co.uk/dp/B08YQ2RLGX', priceNow: '£89', price90Low: '£72', price90High: '£119', stars: 4.3, reviewCount: 1247 },
  { id: '4', title: '10 Best Japandi Bookshelves for 2026', type: 'roundup', category: 'Living Room', status: 'outline-ready', priority: 4 },
  { id: '5', title: 'The Ultimate Japandi Living Room Guide', type: 'pillar', category: 'Living Room', status: 'queued', cluster: 'Ultimate Japandi Living Room Guide', priority: 5 },
  { id: '6', title: '17 Japandi Living Room Decor Ideas', type: 'decor', category: 'Living Room', status: 'queued', cluster: 'Ultimate Japandi Living Room Guide', priority: 6 },
  { id: '7', title: '21 Japandi Bedroom Ideas', type: 'ideas', category: 'Bedroom', status: 'published', publishedDate: '2026-06-05', slug: 'japandi-bedroom-ideas' },
  { id: '8', title: 'The Ultimate Japandi Bedroom Guide', type: 'pillar', category: 'Bedroom', status: 'queued' },
  { id: '9', title: 'The Ultimate Japandi Kitchen Guide', type: 'pillar', category: 'Kitchen', status: 'queued' },
  { id: '10', title: '23 Japandi Kitchen Ideas', type: 'ideas', category: 'Kitchen', status: 'queued' },
  { id: '11', title: 'The Ultimate Japandi Bathroom Guide', type: 'pillar', category: 'Bathroom', status: 'queued' },
];

export const MOCK_BOARDS: PinterestBoard[] = [
  { id: 'board_1', name: 'Japandi Living Room' },
  { id: 'board_2', name: 'Japandi Decor Ideas' },
  { id: 'board_3', name: 'wabi-decore. Picks' },
];

export const PINTEREST_TEMPLATES = [
  { id: 'hero', name: 'Hero Portrait', best: ['Ideas', 'Decor'], engagement: '★★★★ Highest reach', default: true },
  { id: '4grid', name: '4-Photo Grid', best: ['Roundups'], engagement: '★★★★ Very high', default: true },
  { id: 'steps', name: 'Numbered Steps', best: ['How-to', 'DIY'], engagement: '★★★★ Very high', default: true },
  { id: '3strip', name: '3-Column Strip', best: ['Top 3'], engagement: '★★★ High', default: false },
  { id: 'texttop', name: 'Text + Image', best: ['Hacks'], engagement: '★★★ High', default: false },
  { id: 'split', name: 'Split Screen', best: ['Info'], engagement: '★★★ Good', default: false },
  { id: 'mosaic', name: 'Mosaic Collage', best: ['Ideas'], engagement: '★★★★★ Viral', default: false },
  { id: 'quote', name: 'Stat / Quote', best: ['Tips'], engagement: '★★★ Saves well', default: false },
];

export function getArticle(id: string): Article | undefined {
  return MOCK_ARTICLES.find(a => a.id === id);
}

export function getArticlesByStatus(status: Article['status']): Article[] {
  return MOCK_ARTICLES.filter(a => a.status === status);
}
