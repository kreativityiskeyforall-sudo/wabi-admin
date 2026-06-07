import EditClient from './EditClient';

export default function EditPage({ params }: { params: { sanityId: string } }) {
  return <EditClient sanityId={params.sanityId} />;
}
