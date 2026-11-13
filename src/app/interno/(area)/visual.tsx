/* Peças visuais da Academy (redesign escuro). Tudo decorativo fica com aria-hidden. */

/** Fundo das capas ilustradas dos cursos e das iniciais dos setores, em rodízio */
export const FUNDOS_CURSO = ['#C8131A', '#8E0B12', '#26262B', '#3B1012'];
export const FUNDOS_SETOR = ['#C8131A', '#8E0B12', '#3E7B4F', '#7A5410', '#3A3A40'];
const em = <T,>(l: T[], i: number) => l[((i % l.length) + l.length) % l.length];

/** Iniciais de um título: "Sucesso do Cliente" → "SC", "Comercial" → "CO" */
export function iniciaisDe(titulo: string) {
  const p = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^A-Za-z0-9]+/).filter((x) => x && !/^(de|da|do|das|dos|e|a|o)$/i.test(x));
  if (!p.length) return '··';
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[1][0]).toUpperCase();
}

/** Capa ilustrada de curso: quatro desenhos em rodízio sobre a cor do curso */
export function CapaCurso({ indice, numero, selo, imagem }: { indice: number; numero: string; selo?: React.ReactNode; imagem?: string | null }) {
  const desenho = ((indice % 4) + 4) % 4;
  return (
    <div className={`ac-ccapa${imagem ? ' foto' : ''}`} style={imagem ? undefined : { background: em(FUNDOS_CURSO, indice) }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage */}
      {imagem ? <img src={imagem} alt="" loading="lazy" /> : <svg aria-hidden="true" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice">
        {desenho === 0 && <><rect x="150" y="22" width="56" height="56" rx="12" fill="#FFFFFF" opacity=".9" /><rect x="214" y="22" width="56" height="34" rx="10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" /><rect x="150" y="86" width="56" height="34" rx="10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" /><rect x="214" y="64" width="56" height="56" rx="12" fill="#F5A623" /></>}
        {desenho === 1 && <><circle cx="230" cy="75" r="70" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity=".35" /><circle cx="230" cy="75" r="48" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity=".6" /><circle cx="230" cy="75" r="24" fill="#FFFFFF" /><circle cx="230" cy="75" r="8" fill="#C8131A" /></>}
        {desenho === 2 && <><path d="M225 25 L235 65 L275 75 L235 85 L225 125 L215 85 L175 75 L215 65 Z" fill="#FFFFFF" /><path d="M160 30 L165 45 L180 50 L165 55 L160 70 L155 55 L140 50 L155 45 Z" fill="#F5A623" /><circle cx="170" cy="115" r="5" fill="#FFFFFF" opacity=".6" /><circle cx="270" cy="30" r="4" fill="#FFFFFF" opacity=".6" /></>}
        {desenho === 3 && <><circle cx="228" cy="62" r="38" fill="#F5A623" /><rect x="212" y="104" width="32" height="10" rx="4" fill="#FFFFFF" /><rect x="216" y="118" width="24" height="8" rx="4" fill="#FFFFFF" opacity=".7" /><path d="M150 62h22M284 62h-18M182 22l12 10M274 22l-12 10" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" /></>}
      </svg>}
      <span className="ac-ccapa-n">{numero}</span>
      {selo && <span className="ac-ccapa-s">{selo}</span>}
    </div>
  );
}

/** Desenho do foguete na capa gerada da trilha (sem foto enviada) */
export function DecoTrilha() {
  return (
    <svg className="deco" aria-hidden="true" viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice">
      <circle cx="320" cy="95" r="120" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity=".25" />
      <circle cx="320" cy="95" r="78" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity=".4" />
      <g transform="translate(286 58) rotate(45 34 38)">
        <path d="M34 0c14 12 20 30 20 48v16H14V48C14 30 20 12 34 0z" fill="#FFFFFF" />
        <circle cx="34" cy="34" r="7" fill="#C8131A" />
        <path d="M14 50L2 66v8h12zM54 50l12 16v8H54z" fill="#F5A623" />
        <path d="M24 70h20l-4 14h-12z" fill="#F5A623" />
      </g>
    </svg>
  );
}

/** Capelo de formatura da faixa de boas-vindas do início */
export function DecoCapelo() {
  return (
    <svg className="ac-chapeu" aria-hidden="true" width="260" height="200" viewBox="0 0 260 200">
      <path d="M130 20L250 70 130 120 10 70z" fill="none" stroke="#3A3A40" strokeWidth="2" />
      <path d="M60 92v46c40 26 100 26 140 0V92" fill="none" stroke="#3A3A40" strokeWidth="2" />
      <path d="M230 78v58" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
      <circle cx="230" cy="142" r="8" fill="#F5A623" />
    </svg>
  );
}

/** Blocos do card "Comece por aqui" */
export function DecoBlocos() {
  return (
    <svg className="deco" aria-hidden="true" width="340" height="340" viewBox="0 0 340 340">
      <rect x="20" y="20" width="130" height="130" rx="22" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <rect x="180" y="20" width="130" height="80" rx="22" fill="#FFFFFF" />
      <rect x="20" y="180" width="130" height="80" rx="22" fill="#FFFFFF" />
      <rect x="180" y="130" width="130" height="130" rx="22" fill="none" stroke="#FFFFFF" strokeWidth="3" />
    </svg>
  );
}

/** Anel de progresso: feitos de total */
export function AnelProgresso({ feitos, total }: { feitos: number; total: number }) {
  const r = 72, circ = 2 * Math.PI * r;
  const len = total ? (feitos / total) * circ : 0;
  return (
    <div className="ac-anel" role="img" aria-label={`${feitos} de ${total} cursos concluídos`}>
      <svg width="168" height="168" viewBox="0 0 168 168" aria-hidden="true">
        <circle cx="84" cy="84" r={r} fill="none" stroke="#2A2A2F" strokeWidth="14" />
        {len > 0 && <circle cx="84" cy="84" r={r} fill="none" stroke="#C8131A" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${len} ${circ}`} transform="rotate(-90 84 84)" />}
      </svg>
      <div aria-hidden="true"><b>{feitos}<small>/{total}</small></b><span>cursos concluídos</span></div>
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
