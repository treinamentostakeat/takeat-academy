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
