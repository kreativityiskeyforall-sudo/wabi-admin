export const TAB_TO_CATEGORY: Record<string, string> = {
  'Living Room': 'living-room',
  'Bedroom': 'bedroom',
  'Kids & Nursery': 'bedroom',
  'Kitchen': 'kitchen',
  'Dining Room': 'kitchen',
  'Hosting': 'kitchen',
  'Bathroom': 'bathroom',
  'Home Office': 'home-office',
  'Entryway': 'entryway',
  'Wabi-Sabi': 'style',
  'Dark Academia': 'style',
  'Colour & Materials': 'style',
  'Texture & Craft': 'style',
  'Art & Wall Decor': 'style',
  'Travel Inspired': 'style',
  'Style Comparisons': 'style',
  'Beginner Guides': 'guides',
  'Product Guides': 'guides',
  'Makeovers': 'guides',
  'Rental Living': 'guides',
  'Apartment': 'guides',
  'Wellbeing': 'guides',
  'Sustainable': 'guides',
  'Outdoor': 'guides',
  'Gifting': 'gift-guides',
  'Seasonal': 'gift-guides',
};

const EXTRA_NICHES_CLUSTER_MAP: Record<string, string> = {
  'Home Office': 'home-office',
  'Kids Room': 'bedroom',
  'Outdoor': 'guides',
  'Dark Academia': 'style',
  'Makeovers': 'guides',
  'Rentals': 'guides',
};

export function getWebsiteCategory(tab: string, cluster?: string, contentType?: string): string {
  if (tab === 'Extra Niches') {
    if (contentType?.toLowerCase() === 'gift') return 'gift-guides';
    const cleanCluster = cluster?.replace(/^→\s*/, '').trim() ?? '';
    return EXTRA_NICHES_CLUSTER_MAP[cleanCluster] ?? 'guides';
  }
  return TAB_TO_CATEGORY[tab] ?? 'guides';
}

export const WEBSITE_CATEGORIES = [
  { label: 'Living Room',       slug: 'living-room' },
  { label: 'Bedroom',           slug: 'bedroom' },
  { label: 'Kitchen & Dining',  slug: 'kitchen' },
  { label: 'Bathroom',          slug: 'bathroom' },
  { label: 'Home Office',       slug: 'home-office' },
  { label: 'Entryway',          slug: 'entryway' },
  { label: 'Style & Inspiration', slug: 'style' },
  { label: 'Guides & How-To',   slug: 'guides' },
  { label: 'Gifts & Seasonal',  slug: 'gift-guides' },
];
