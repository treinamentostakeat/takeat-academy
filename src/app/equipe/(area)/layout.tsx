import { redirect } from 'next/navigation';
import { EquipeShell } from '@/components/EquipeShell';
import { DemoBar } from '@/components/DemoBar';
import { exigirUsuario, sair } from '@/lib/sessao';

async function sairAction() {
  'use server';
  await sair();
  redirect('/equipe/entrar');
}

export default async function LayoutEquipe({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return (
    <>
      <DemoBar />
      <EquipeShell usuario={usuario} sairAction={sairAction}>{children}</EquipeShell>
    </>
  );
}
