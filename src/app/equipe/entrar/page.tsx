import { TelaEntrar } from '@/components/TelaEntrar';

export const metadata = { title: 'Entrar · Equipe' };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <TelaEntrar rota="/equipe/entrar" selo="Academy · Equipe" titulo="Entrar na área da equipe" texto="Use o e-mail e a senha do seu convite." erro={erro} />;
}
