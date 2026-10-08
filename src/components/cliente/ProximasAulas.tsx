import Link from 'next/link';
import { TemaTile } from '@/components/TemaTile';
import { faixaH, tituloDia } from './comum';
import type { ProximaAula } from './dados';

/** Bloco "Suas próximas aulas" (Início e Aulas ao vivo). Mostra até 4; o resto fica no perfil. */
export function ProximasAulas({ aulas, hoje }: { aulas: ProximaAula[]; hoje: string }) {
  if (!aulas.length) return null;
  const MAX = 4, mais = aulas.length - MAX;
  return (
    <section className="card mine" aria-labelledby="mine-h">
      <div className="mine-h">
        <h2 className="sec-h" id="mine-h">Suas próximas aulas</h2>
        <Link className="link" href="/perfil">Ver no perfil<span className="icon s16">arrow_forward</span></Link>
      </div>
      <ul>
        {aulas.slice(0, MAX).map(({ turma: t }) => (
          <li key={t.id}>
            <TemaTile tema={t.tema} size="sm" />
            <div className="txt"><div className="n">{t.tema}</div><div className="d">{tituloDia(t.data, hoje)} · {faixaH(t.hora)}</div></div>
            {t.sit === 'ao-vivo'
              ? <span className="chip chip-red"><span className="dot pulse" />Ao vivo</span>
              : <span className="chip chip-teal"><span className="icon s16 fill">check_circle</span>Inscrito</span>}
          </li>
        ))}
      </ul>
      {mais > 0 && <div className="more">Mais {mais} {mais === 1 ? 'inscrição' : 'inscrições'} no <Link href="/perfil">perfil do restaurante</Link>.</div>}
    </section>
  );
}
