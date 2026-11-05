'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { iniciais } from '@/lib/formato';
import { ROTULO_CARGO, inicioDe } from '@/lib/permissoes';
import type { UsuarioSessao } from '@/lib/sessao';

/* Moldura das áreas com login: topo e menu lateral (classes de styles/equipe.css). */

export type ItemNav = { href: string; icon: string; label: string; exato?: boolean };
export type GrupoNav = { t: string; items: ItemNav[] };

export function Shell({ usuario, sairAction, nav, selo, children }: { usuario: UsuarioSessao; sairAction: () => Promise<void>; nav: GrupoNav[]; selo: string; children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const atual = (i: ItemNav) => (i.exato ? path === i.href : path.startsWith(i.href));
  return (
    <>
      <header className="eq-top">
        <div className="eq-top-in">
          <button className="eq-menu-btn" onClick={() => setMenu((m) => !m)} aria-label="Abrir menu"><span className="icon s24">menu</span></button>
          <Link className="brand" href={inicioDe(usuario.cargo)} aria-label={`Takeat ${selo}`}><img src="/brand/takeat-logo.svg" alt="Takeat" /></Link>
          <span className="eq-badge">{selo}</span>
          <div className="eq-user">
            <span className="av me">{iniciais(usuario.nome)}</span>
            <div className="txt"><div className="n">{usuario.nome}</div><div className="c">{ROTULO_CARGO[usuario.cargo]}</div></div>
            <form action={sairAction}><button className="btn btn-m btn-outlined" type="submit" aria-label="Sair"><span className="icon">logout</span></button></form>
          </div>
        </div>
      </header>
      <div className="eq">
        <nav className={`eq-nav${menu ? ' on' : ''}`} aria-label="Menu da área">
          {nav.filter((g) => g.items.length).map((g) => (
            <div className="grp" key={g.t}>
              <div className="grp-t">{g.t}</div>
              {g.items.map((i) => (
                <Link key={i.href} href={i.href} onClick={() => setMenu(false)} aria-current={atual(i) ? 'page' : undefined}><span className="icon">{i.icon}</span>{i.label}</Link>
              ))}
            </div>
          ))}
        </nav>
        <main className="eq-main" id="eq-main">{children}</main>
      </div>
    </>
  );
}
