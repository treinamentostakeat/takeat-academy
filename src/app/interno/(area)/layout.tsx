import { redirect } from 'next/navigation';
import { Shell, type GrupoNav } from '@/components/Shell';
import { ehEquipe, podeGerirPessoas } from '@/lib/permissoes';
import { exigirPessoa, sair } from '@/lib/sessao';

async function sairAction() {
  'use server';
  await sair();
  redirect('/interno/entrar');
}

export default async function LayoutInterno({ children }: { children: React.ReactNode }) {
  const usuario = await exigirPessoa();
  const nav: GrupoNav[] = [
    { t: 'Onboarding', items: [{ href: '/interno', icon: 'home', label: 'Início', exato: true }] },
    { t: 'Administração', items: [
      ...(podeGerirPessoas(usuario.cargo) ? [{ href: '/interno/pessoas', icon: 'group', label: 'Pessoas' }] : []),
      ...(ehEquipe(usuario.cargo) ? [{ href: '/equipe/agenda', icon: 'calendar_month', label: 'Área da equipe' }] : []),
    ] },
    { t: 'Conta', items: [{ href: '/interno/senha', icon: 'lock', label: 'Trocar senha' }] },
  ];
  return <Shell usuario={usuario} sairAction={sairAction} nav={nav} selo="Academy · Onboarding">{children}</Shell>;
}
