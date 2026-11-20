import DraftClient from './DraftClient';

export default function DraftPage({ params }: { params: { id: string } }) {
  // .wsbody provides flex:1 + overflow-y:auto so the page scrolls inside the fixed sidebar layout
  return (
    <div className="wsbody">
      <DraftClient draftId={decodeURIComponent(params.id)} />
    </div>
  );
}
