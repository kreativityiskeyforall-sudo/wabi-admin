import { getArticleById } from '@/lib/sheets';
import PublishClient from './PublishClient';

export default async function PublishPage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <PublishClient id={params.id} article={article} />;
}
