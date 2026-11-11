import { redirect } from 'next/navigation';
import { EquipeShell } from '@/components/EquipeShell';
import { DemoBar } from '@/components/DemoBar';
import { podeClonarVoz } from '@/lib/permissoes';
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
      <EquipeShell usuario={usuario} sairAction={sairAction} podeVoz={podeClonarVoz(usuario, process.env.VOZ_ACESSO_EMAILS)}>{children}</EquipeShell>
    </>
  );
}
