import { redirect } from 'next/navigation';
import { AcademyShell } from '@/components/AcademyShell';
import type { ItemNav } from '@/components/Shell';
import { db } from '@/lib/db';
import { ehEquipe, podeClonarVoz, podeEditarConteudo, podeGerirPessoas } from '@/lib/permissoes';
import { exigirPessoa, sair } from '@/lib/sessao';
import './academy.css';

async function sairAction() {
  'use server';
  await sair();
  redirect('/interno/entrar');
}

export default async function LayoutInterno({ children }: { children: React.ReactNode }) {
  const usuario = await exigirPessoa();
  const editor = podeEditarConteudo(usuario.cargo);
  // "Minha trilha": a primeira trilha que a pessoa vê (publicada; quem edita vê também as não publicadas)
  const trilha = await db.trilha.findFirst({ where: editor ? {} : { publicada: true }, orderBy: { criadoEm: 'asc' }, select: { id: true } });
  const aprender: ItemNav[] = [
    { href: '/interno', icon: 'home', label: 'Início', exato: true },
    ...(trilha ? [{ href: `/interno/trilhas/${trilha.id}`, icon: 'route', label: 'Minha trilha' }] : []),
    { href: '/aulas', icon: 'videocam', label: 'Aulas ao vivo' },
  ];
  const admin: ItemNav[] = [
    ...(editor ? [{ href: '/interno/conteudo', icon: 'edit_note', label: 'Editar conteúdo' }] : []),
    ...(podeGerirPessoas(usuario.cargo) ? [{ href: '/interno/pessoas', icon: 'group', label: 'Pessoas' }] : []),
    ...(podeClonarVoz(usuario, process.env.VOZ_ACESSO_EMAILS) ? [{ href: '/interno/voz', icon: 'record_voice_over', label: 'Voz e fala' }] : []),
    ...(ehEquipe(usuario.cargo) ? [{ href: '/equipe/agenda', icon: 'calendar_month', label: 'Área da equipe' }] : []),
  ];
  const conta: ItemNav[] = [{ href: '/interno/senha', icon: 'lock', label: 'Trocar senha' }];
  return <AcademyShell usuario={usuario} sairAction={sairAction} aprender={aprender} admin={admin} conta={conta}>{children}</AcademyShell>;
}
