'use client';
import type { UsuarioSessao } from '@/lib/sessao';
import { Shell, type GrupoNav } from './Shell';

/* Shell da área da equipe: menu lateral por cargo. */

export function EquipeShell({ usuario, sairAction, children }: { usuario: UsuarioSessao; sairAction: () => Promise<void>; children: React.ReactNode }) {
  const gestor = usuario.cargo === 'gestor';
  const nav: GrupoNav[] = [
    { t: 'Operação', items: [
      { href: '/equipe/agenda', icon: 'calendar_month', label: 'Agenda' },
      ...(gestor ? [{ href: '/equipe/grade', icon: 'view_week', label: 'Grade modelo' }] : []),
    ] },
    { t: 'Administração', items: gestor ? [
      { href: '/equipe/usuarios', icon: 'group', label: 'Usuários e cargos' },
      { href: '/interno/pessoas', icon: 'badge', label: 'Onboarding interno' },
    ] : [] },
    { t: 'Conta', items: [{ href: '/equipe/conta', icon: 'person', label: 'Minha conta' }] },
  ];
  return <Shell usuario={usuario} sairAction={sairAction} nav={nav} selo="Academy · Equipe">{children}</Shell>;
}
