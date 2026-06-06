import { getArticleById } from '@/lib/sheets';
import BriefClient from './BriefClient';

export default async function BriefPage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <BriefClient id={params.id} article={article} />;
}
