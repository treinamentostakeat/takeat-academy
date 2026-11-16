/* Peças visuais da Academy (redesign escuro). Tudo decorativo fica com aria-hidden. */

/** Iniciais de um título: "Sucesso do Cliente" → "SC", "Comercial" → "CO" */
export function iniciaisDe(titulo: string) {
  const p = titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^A-Za-z0-9]+/).filter((x) => x && !/^(de|da|do|das|dos|e|a|o)$/i.test(x));
  if (!p.length) return '··';
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[1][0]).toUpperCase();
}

/** Capa sem foto: textura escura com o monograma do título em serifada (no lugar de formas coloridas) */
export function Monograma({ texto }: { texto: string }) {
  const ini = iniciaisDe(texto);
  return <span className="ac-mono" aria-hidden="true"><span>{ini[0]}{ini.slice(1).toLowerCase()}</span></span>;
}

/** Capa de curso: foto com degradê escuro ou monograma; número e selo por cima */
export function CapaCurso({ titulo, numero, selo, imagem }: { titulo: string; numero: string; selo?: React.ReactNode; imagem?: string | null }) {
  return (
    <div className={`ac-ccapa${imagem ? ' foto' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage */}
      {imagem ? <img src={imagem} alt="" loading="lazy" /> : <Monograma texto={titulo} />}
      <span className="ac-ccapa-n">{numero}</span>
      {selo && <span className="ac-ccapa-s">{selo}</span>}
    </div>
  );
}

/** Medalha em traço fino, dourada (conquistas) */
export function IconeMedalha({ tamanho = 16 }: { tamanho?: number }) {
  return (
    <svg className="ac-medalha" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 2.5h9l-2.6 6.2M7.5 2.5l2.6 6.2" /><circle cx="12" cy="15" r="6" /><path d="M12 12.3l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
    </svg>
  );
}

/** Anel de progresso: feitos de total */
export function AnelProgresso({ feitos, total }: { feitos: number; total: number }) {
  // Anel de 184px com traço fino de 6px: o miolo livre (cerca de 160px) cabe o número e a legenda em duas linhas
  const t = 184, traco = 6, r = (t - traco) / 2 - 2, circ = 2 * Math.PI * r;
  const len = total ? Math.min(1, feitos / total) * circ : 0;
  return (
    <div className="ac-anel" role="img" aria-label={`${feitos} de ${total} cursos concluídos`}>
      <svg width={t} height={t} viewBox={`0 0 ${t} ${t}`} aria-hidden="true">
        <circle className="trilho" cx={t / 2} cy={t / 2} r={r} fill="none" strokeWidth={traco} />
        {/* Com 0% só aparece o trilho cinza; o arco cresce até a fração concluída ao abrir a tela */}
        {len > 0 && <circle className="arco" cx={t / 2} cy={t / 2} r={r} fill="none" strokeWidth={traco} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - len} transform={`rotate(-90 ${t / 2} ${t / 2})`} style={{ '--ac-anel-de': circ } as React.CSSProperties} />}
      </svg>
      <div aria-hidden="true"><b>{feitos}<small>/{total}</small></b><span>cursos<br />concluídos</span></div>
    </div>
  );
}

/** Card de algo que ainda não tem conteúdo: sem link, sem seta, mais apagado, com o selo "Em breve".
    `linha` = versão em linha (listas laterais); sem ela, card de grade. */
export function EmBreve({ icon, titulo, texto, linha }: { icon: string; titulo: string; texto?: string; linha?: boolean }) {
  const selo = <span className="ac-embreve">Em breve</span>;
  if (linha) {
    return (
      <div className="ac-lin off" aria-disabled="true">
        <span className="ac-ic peq" aria-hidden="true"><span className="icon">{icon}</span></span>
        <span><b>{titulo}</b>{texto && <small>{texto}</small>}</span>
        {selo}
      </div>
    );
  }
  return (
    <div className="ac-sis off" aria-disabled="true">
      <div className="ac-sis-h"><span className="ac-ic" aria-hidden="true"><span className="icon">{icon}</span></span>{selo}</div>
      <b>{titulo}</b>{texto && <p>{texto}</p>}
    </div>
  );
}

/** Barra fina de progresso com texto "x de y · z%" */
export function Progresso({ feitos, total }: { feitos: number; total: number }) {
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  return (
    <div className="ac-prog">
      <div className="ac-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso na trilha"><i style={{ width: `${pct}%` }} /></div>
      <span>{feitos} de {total} · {pct}%</span>
    </div>
  );
}
