import Link from 'next/link';
import { DemoBar } from '@/components/DemoBar';
import './sala-ao-vivo.css';

/* Página de aviso da sala (link inválido, aula cancelada, sem inscrição, aula não encontrada).
   Mesmo topo da sala e card central do fim da aula. */

type Acao = { href: string; label: string; icon?: string };

export function TopoSimples() {
  return (
    <header className="top">
      <div className="top-in">
        <Link className="brand" href="/" aria-label="Takeat Academy, voltar ao início"><img src="/brand/takeat-logo.svg" alt="Takeat" /><span>Academy</span></Link>
      </div>
    </header>
  );
}

export function AvisoSala({ icone, neutro, titulo, texto, principal, secundaria, topo = true }: {
  icone: string; neutro?: boolean; titulo: string; texto: React.ReactNode; principal?: Acao; secundaria?: Acao; topo?: boolean;
}) {
  return (
    <>
      {topo && <><DemoBar /><TopoSimples /></>}
      <main className="rate">
        <section className="card done" style={{ padding: 32 }}>
          <div className={`aviso-ic${neutro ? ' neutro' : ''}`}><span className="icon">{icone}</span></div>
          <h1>{titulo}</h1>
          <p>{texto}</p>
          {(principal || secundaria) && (
            <div className="actions">
              {principal && <Link className="btn btn-l btn-filled btn-block" href={principal.href}>{principal.icon && <span className="icon">{principal.icon}</span>}{principal.label}</Link>}
              {secundaria && <Link className="btn btn-l btn-outlined btn-block" href={secundaria.href}>{secundaria.icon && <span className="icon">{secundaria.icon}</span>}{secundaria.label}</Link>}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
