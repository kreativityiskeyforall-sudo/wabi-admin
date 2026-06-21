import ShopEditClient from './ShopEditClient';

export default function ShopEditPage({ params }: { params: { sanityId: string } }) {
  return <ShopEditClient sanityId={params.sanityId} />;
}
