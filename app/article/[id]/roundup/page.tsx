import { getArticleById } from '@/lib/sheets';
import RoundupClient from './RoundupClient';

export default async function RoundupPage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id);
  return <RoundupClient id={params.id} article={article} />;
}
