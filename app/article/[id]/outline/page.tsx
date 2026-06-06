import { getArticleById } from '@/lib/sheets';
import OutlineClient from './OutlineClient';

export default async function OutlinePage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <OutlineClient id={params.id} article={article} />;
}
