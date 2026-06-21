import { getArticleById } from '@/lib/sheets';
import ShopClient from './ShopClient';

export default async function ShopPage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <ShopClient id={params.id} article={article} />;
}
