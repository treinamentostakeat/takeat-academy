'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { iniciais } from '@/lib/formato';
import { ROTULO_CARGO } from '@/lib/permissoes';
import type { UsuarioSessao } from '@/lib/sessao';
import type { ItemNav } from './Shell';

/* Moldura da Takeat Academy (área interna): tema escuro, menu lateral com "Aprender" em cima
   e administração/conta no rodapé, pessoa e botão de sair no topo do conteúdo. Estilos em academy.css. */

export function AcademyShell({ usuario, sairAction, aprender, admin, conta, children }: {
  usuario: UsuarioSessao; sairAction: () => Promise<void>; aprender: ItemNav[]; admin: ItemNav[]; conta: ItemNav[]; children: React.ReactNode;
}) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const atual = (i: ItemNav) => (i.exato ? path === i.href : path.startsWith(i.href));
  const link = (i: ItemNav, simples?: boolean) => (
    <Link key={i.href} href={i.href} className={simples ? 'ac-nav-s' : undefined} onClick={() => setMenu(false)} aria-current={atual(i) ? 'page' : undefined}>
      {!simples && <span className="icon" aria-hidden="true">{i.icon}</span>}{i.label}
    </Link>
  );
  return (
    <div className="ac">
      <nav className={`ac-nav${menu ? ' on' : ''}`} aria-label="Menu da Academy">
        <div className="ac-nav-top">
          <Link href="/interno" className="ac-marca" aria-label="Takeat Academy, início">
            <span className="ac-marca-t">Takeat</span><span className="ac-marca-s">ACADEMY</span>
          </Link>
          <button type="button" className="ac-menu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="ac-nav-itens" aria-label={menu ? 'Fechar menu' : 'Abrir menu'}>
            <span className="icon" aria-hidden="true">{menu ? 'close' : 'menu'}</span>
          </button>
        </div>
        <div className="ac-nav-itens" id="ac-nav-itens">
          <div className="ac-grp">
            <p className="ac-grp-t">APRENDER</p>
            {aprender.map((i) => link(i))}
          </div>
          {(admin.length > 0 || conta.length > 0) && (
            <div className="ac-grp ac-grp-pe">
              {admin.length > 0 && <><p className="ac-grp-t">ADMINISTRAÇÃO</p>{admin.map((i) => link(i, true))}</>}
              {conta.length > 0 && <><p className="ac-grp-t">CONTA</p>{conta.map((i) => link(i, true))}</>}
            </div>
          )}
        </div>
      </nav>
      <main className="ac-main" id="eq-main">
        <header className="ac-top">
          <div className="ac-quem"><p className="n">{usuario.nome}</p><p className="c">{ROTULO_CARGO[usuario.cargo]}</p></div>
          <span className="ac-av" aria-hidden="true">{iniciais(usuario.nome)}</span>
          <form action={sairAction}><button className="ac-sair" type="submit" aria-label="Sair" title="Sair"><span className="icon" aria-hidden="true">logout</span></button></form>
        </header>
        {children}
      </main>
    </div>
  );
}
