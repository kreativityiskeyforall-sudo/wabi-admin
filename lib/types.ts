export type ArticleType = 'pillar' | 'ideas' | 'hacks' | 'guide' | 'decor' | 'product-review' | 'roundup';
export type ArticleStatus = 'queued' | 'outline-ready' | 'writing' | 'images' | 'pinterest' | 'published';
export type ArticleCategory = 'Living Room' | 'Bedroom' | 'Kitchen' | 'Bathroom';

export interface Article {
  id: string;
  title: string;
  type: ArticleType;
  category: ArticleCategory;
  status: ArticleStatus;
  cluster?: string;
  priority?: number;
  slug?: string;
  sanityId?: string;
  publishedDate?: string;
  // product fields
  amazonUrl?: string;
  priceNow?: string;
  price90Low?: string;
  price90High?: string;
  stars?: number;
  reviewCount?: number;
}

export interface Heading {
  level: 'H1' | 'H2';
  text: string;
  note: string;
}

export interface OutlineData {
  seoTitle: string;
  metaDesc: string;
  summary: string;
  wordCount: number;
  headings: Heading[];
}

export interface PriceData {
  current: string;
  low90: string;
  high90: string;
}

export interface ProductBrief {
  articleTitle: string;
  amazonUrl: string;
  angle: string;
  priceNow: string;
  price90Low: string;
  price90High: string;
  stars: number;
  reviewCount: number;
  imageUrls: string[];
}

export interface RoundupProduct {
  name: string;
  amazonUrl: string;
  notes: string;
  priceNow: string;
  price90Low: string;
  price90High: string;
  stars: number;
  reviewCount: number;
  imageUrl?: string;
  isBestPick?: boolean;
}

export interface PinterestPin {
  id: string;
  template: string;
  templateName: string;
  imageUrl?: string;
  title: string;
  description: string;
  destinationUrl: string;
  boardId: string;
  scheduledDate: string;
  scheduledTime: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
}
