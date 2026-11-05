import { TelaEntrar } from '@/components/TelaEntrar';

export const metadata = { title: 'Entrar · Onboarding' };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <TelaEntrar rota="/interno/entrar" selo="Academy · Onboarding" titulo="Entrar no onboarding Takeat" texto="Use o e-mail e a senha que você recebeu do RH." erro={erro} />;
}
