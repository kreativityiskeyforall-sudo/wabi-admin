import { getArticleById } from '@/lib/sheets';
import PinterestClient from './PinterestClient';

export default async function PinterestPage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <PinterestClient id={params.id} article={article} />;
}
