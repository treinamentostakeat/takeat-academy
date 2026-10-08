'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/* Cabeçalho do cliente: logo, menu principal (drawer no celular) e restaurante identificado. */

const MENU = [
  { href: '/', label: 'Início', icon: 'home' },
  { href: '/aulas', label: 'Aulas ao vivo', icon: 'videocam' },
  { href: '/plantao', label: 'Plantão', icon: 'support_agent', breve: true },
  { href: '/gravadas', label: 'Aulas gravadas', icon: 'play_circle', breve: true },
  { href: '/duvidas', label: 'Dúvidas', icon: 'help', breve: true },
  { href: '/trilhas', label: 'Trilhas', icon: 'route', breve: true },
  { href: '/novidades', label: 'Novidades', icon: 'campaign', breve: true },
];

export function HeaderCliente({ restaurante }: { restaurante?: { nome: string; iniciais: string } | null }) {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);
  const atual = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  // Itens da fase 2+ ainda não existem: ficam fora do menu até serem construídos
  const itens = MENU.filter((m) => !m.breve);

  return (
    <>
      <header className="header">
        <div className="header-in">
          <button className="menu-btn" onClick={() => setAberto(true)} aria-label="Abrir menu"><span className="icon s24">menu</span></button>
          <Link className="brand" href="/" aria-label="Takeat Academy, início"><img src="/brand/takeat-logo.svg" alt="Takeat" /><span>Academy</span></Link>
          <nav className="nav" aria-label="Principal">
            {itens.map((m) => <Link key={m.href} href={m.href} aria-current={atual(m.href) ? 'page' : undefined}>{m.label}</Link>)}
          </nav>
          <div className="who">
            {restaurante ? (
              <Link className="who-id" href="/perfil" aria-label={`Perfil do restaurante ${restaurante.nome}`}>
                <span className="avatar">{restaurante.iniciais}</span><span className="n">{restaurante.nome}</span>
              </Link>
            ) : (
              <Link className="btn btn-m btn-outlined" href="/perfil"><span className="icon">storefront</span><span className="btn-label">Identificar restaurante</span></Link>
            )}
          </div>
        </div>
      </header>
      <div className={`drawer${aberto ? ' on' : ''}`} aria-hidden={!aberto}>
        <div className="bg" onClick={() => setAberto(false)} />
        <nav aria-label="Principal">
          <div className="top-d">
            <Link className="brand" href="/"><img src="/brand/takeat-logo.svg" alt="Takeat" style={{ height: 24 }} /><span>Academy</span></Link>
            <button className="x" onClick={() => setAberto(false)} aria-label="Fechar menu"><span className="icon">close</span></button>
          </div>
          {itens.map((m) => (
            <Link key={m.href} href={m.href} onClick={() => setAberto(false)} aria-current={atual(m.href) ? 'page' : undefined}><span className="icon">{m.icon}</span>{m.label}</Link>
          ))}
        </nav>
      </div>
    </>
  );
}
