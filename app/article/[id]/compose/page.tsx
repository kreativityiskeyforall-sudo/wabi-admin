import { getArticleById } from '@/lib/sheets';
import ComposeClient from './ComposeClient';

export default async function ComposePage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <ComposeClient id={params.id} article={article} />;
}
