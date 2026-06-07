import MediaClient from './MediaClient';

export default function MediaPage({ searchParams }: { searchParams: { tab?: string } }) {
  const defaultTab = searchParams.tab === 'sections' ? 'sections' : 'pinterest';
  return <MediaClient defaultTab={defaultTab} />;
}
