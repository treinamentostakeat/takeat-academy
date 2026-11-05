import { corDaEtapa, iconeDoCurso } from '@/lib/aprendizagem';

/* Peças pequenas da área interna */

export function BarraProgresso({ feitos, total }: { feitos: number; total: number }) {
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  return (
    <div className="in-prog">
      <div className="in-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso"><i style={{ width: `${pct}%` }} /></div>
      <span>{feitos} de {total} concluídos · {pct}%</span>
    </div>
  );
}

/** Capa gerada do curso: cor da etapa, ícone do assunto e a etapa escrita. Sem imagem enviada. */
export function Capa({ titulo, etapa, indiceEtapa, selo, grande }: { titulo: string; etapa: string; indiceEtapa: number; selo?: React.ReactNode; grande?: boolean }) {
  return (
    <div className={`in-capa c-${corDaEtapa(indiceEtapa)}${grande ? ' grande' : ''}`} aria-hidden="true">
      <span className="in-capa-e">{etapa}</span>
      <span className="icon in-capa-i">{iconeDoCurso(titulo)}</span>
      {selo && <span className="in-capa-s">{selo}</span>}
    </div>
  );
}
