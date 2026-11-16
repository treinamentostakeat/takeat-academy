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

/** Resumo da gamificação no topo: nível, XP, progresso até o próximo nível e semanas seguidas */
export type Placar = { nivel: string; xp: number; pct: number; prox: string | null; streak: number };

export function AcademyShell({ usuario, sairAction, aprender, admin, conta, placar, children }: {
  usuario: UsuarioSessao; sairAction: () => Promise<void>; aprender: ItemNav[]; admin: ItemNav[]; conta: ItemNav[]; placar?: Placar; children: React.ReactNode;
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
            <span className="ac-marca-t">Takeat</span><span className="ac-marca-s">Academy</span>
          </Link>
          <button type="button" className="ac-menu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="ac-nav-itens" aria-label={menu ? 'Fechar menu' : 'Abrir menu'}>
            <span className="icon" aria-hidden="true">{menu ? 'close' : 'menu'}</span>
          </button>
        </div>
        <div className="ac-nav-itens" id="ac-nav-itens">
          <div className="ac-grp">
            <p className="ac-grp-t">Aprender</p>
            {aprender.map((i) => link(i))}
          </div>
          {(admin.length > 0 || conta.length > 0) && (
            <div className="ac-grp ac-grp-pe">
              {admin.length > 0 && <><p className="ac-grp-t">Administração</p>{admin.map((i) => link(i, true))}</>}
              {conta.length > 0 && <><p className="ac-grp-t">Conta</p>{conta.map((i) => link(i, true))}</>}
            </div>
          )}
        </div>
      </nav>
      <main className="ac-main" id="eq-main">
        <header className="ac-top">
          {placar && (
            <Link href="/interno/perfil" className="ac-placar" aria-label={`Nível ${placar.nivel}, ${placar.xp} XP${placar.streak ? `, ${placar.streak} semanas seguidas` : ''}. Ver meu perfil`}>
              {placar.streak > 0 && <span className="ac-fogo" title={`${placar.streak} ${placar.streak === 1 ? 'semana seguida' : 'semanas seguidas'} com atividade`}><span className="icon" aria-hidden="true">local_fire_department</span>{placar.streak}</span>}
              <span className="ac-placar-n"><b>{placar.nivel}</b><small>{placar.xp.toLocaleString('pt-BR')} XP</small></span>
              <span className="ac-placar-b" aria-hidden="true" title={placar.prox ? `${placar.pct}% até ${placar.prox}` : 'Nível máximo'}><i style={{ width: `${placar.pct}%` }} /></span>
            </Link>
          )}
          <Link href="/interno/perfil" className="ac-quem"><p className="n">{usuario.nome}</p><p className="c">{ROTULO_CARGO[usuario.cargo]}</p></Link>
          <span className="ac-av" aria-hidden="true">{iniciais(usuario.nome)}</span>
          <form action={sairAction}><button className="ac-sair" type="submit" aria-label="Sair" title="Sair"><span className="icon" aria-hidden="true">logout</span></button></form>
        </header>
        {children}
      </main>
    </div>
  );
}
