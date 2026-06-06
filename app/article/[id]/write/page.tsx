import { getArticleById } from '@/lib/sheets';
import WriteClient from './WriteClient';

export default async function WritePage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <WriteClient id={params.id} article={article} />;
}
