import { getArticleById } from '@/lib/sheets';
import ImagesClient from './ImagesClient';

export default async function ImagesPage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <ImagesClient id={params.id} article={article} />;
}
