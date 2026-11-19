import DraftClient from './DraftClient';

export default function DraftPage({ params }: { params: { id: string } }) {
  return <DraftClient draftId={decodeURIComponent(params.id)} />;
}
