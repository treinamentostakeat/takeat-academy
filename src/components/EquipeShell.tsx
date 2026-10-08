'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { UsuarioSessao } from '@/lib/sessao';
import { iniciais } from '@/lib/formato';

/* Shell da área da equipe: topo, menu lateral por cargo (classes de styles/equipe.css). */

type Item = { href: string; icon: string; label: string; gestor?: boolean };
const NAV: { t: string; items: Item[] }[] = [
  { t: 'Operação', items: [
    { href: '/equipe/agenda', icon: 'calendar_month', label: 'Agenda' },
    { href: '/equipe/grade', icon: 'view_week', label: 'Grade modelo', gestor: true },
  ] },
  { t: 'Administração', items: [
    { href: '/equipe/usuarios', icon: 'group', label: 'Usuários e cargos', gestor: true },
  ] },
  { t: 'Conta', items: [
    { href: '/equipe/conta', icon: 'person', label: 'Minha conta' },
  ] },
];

export function EquipeShell({ usuario, sairAction, children }: { usuario: UsuarioSessao; sairAction: () => Promise<void>; children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [path]);
  const gestor = usuario.cargo === 'gestor';
  return (
    <>
      <header className="eq-top">
        <div className="eq-top-in">
          <button className="eq-menu-btn" onClick={() => setMenu((m) => !m)} aria-label="Abrir menu"><span className="icon s24">menu</span></button>
          <Link className="brand" href="/equipe/agenda" aria-label="Takeat Academy, área da equipe"><img src="/brand/takeat-logo.svg" alt="Takeat" /></Link>
          <span className="eq-badge">Academy · Equipe</span>
          <div className="eq-user">
            <span className="av me">{iniciais(usuario.nome)}</span>
            <div className="txt"><div className="n">{usuario.nome}</div><div className="c">{gestor ? 'Gestor' : 'Instrutor'}</div></div>
            <form action={sairAction}><button className="btn btn-m btn-outlined" type="submit" aria-label="Sair"><span className="icon">logout</span></button></form>
          </div>
        </div>
      </header>
      <div className="eq">
        <nav className={`eq-nav${menu ? ' on' : ''}`} aria-label="Área da equipe">
          {NAV.map((g) => {
            const items = g.items.filter((i) => !i.gestor || gestor);
            if (!items.length) return null;
            return (
              <div className="grp" key={g.t}>
                <div className="grp-t">{g.t}</div>
                {items.map((i) => (
                  <Link key={i.href} href={i.href} aria-current={path.startsWith(i.href) ? 'page' : undefined}><span className="icon">{i.icon}</span>{i.label}</Link>
                ))}
              </div>
            );
          })}
        </nav>
        <main className="eq-main" id="eq-main">{children}</main>
      </div>
    </>
  );
}
