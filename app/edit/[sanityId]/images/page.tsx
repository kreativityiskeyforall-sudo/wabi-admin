import AddImagesClient from './AddImagesClient';

export default function AddImagesPage({ params }: { params: { sanityId: string } }) {
  return <AddImagesClient sanityId={params.sanityId} />;
}
