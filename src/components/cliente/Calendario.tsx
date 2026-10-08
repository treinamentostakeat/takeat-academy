'use client';
/* Calendário semanal das aulas ao vivo: dias nas colunas, horários nas linhas.
   No celular vira abas de dia + uma coluna. Os estados de cada bloco vêm prontos do servidor. */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TemaTile } from '@/components/TemaTile';
import { temaVars } from '@/lib/temas';
import { AbrirInscricao, EntrarAula } from './Inscricao';

export type DiaCal = { iso: string; wd: string; dt: number; hoje: boolean; passado: boolean };
export type Celula =
  | { estado: 'vazio' }
  | { estado: 'off' | 'cancelada' | 'ao-vivo' | 'inscrito' | 'aberta'; id: string; tema: string; label: string };

export function Calendario({ dias, horas, celulas, rotulo }: { dias: DiaCal[]; horas: readonly number[]; celulas: Record<string, Celula>; rotulo: string }) {
  const [sel, setSel] = useState(() => (dias.find((d) => !d.passado) ?? dias[0]).iso);
  return (
    <>
      <div className="dtabs" role="tablist" aria-label="Dia da semana">
        {dias.map((d) => (
          <button key={d.iso} type="button" className="dtab" role="tab" aria-selected={d.iso === sel} disabled={d.passado} onClick={() => setSel(d.iso)}>
            <span className="wd">{d.hoje ? 'Hoje' : d.wd}</span><span className="dt">{d.dt}</span>
          </button>
        ))}
      </div>
      <div className="cal" style={{ ['--ndias' as string]: dias.length }} aria-label={`Aulas da semana de ${rotulo}`}>
        <div className="ch corner" />
        {dias.map((d) => (
          <div key={d.iso} className={`ch${d.hoje ? ' today' : ''}${d.passado ? ' past' : ''}`}>
            <span className="wd">{d.wd}</span><span className="dt">{d.dt}</span>
          </div>
        ))}
        {horas.map((h, r) => (
          <Linha key={h} h={h} primeira={r === 0} dias={dias} celulas={celulas} sel={sel} />
        ))}
      </div>
    </>
  );
}

function Linha({ h, primeira, dias, celulas, sel }: { h: number; primeira: boolean; dias: DiaCal[]; celulas: Record<string, Celula>; sel: string }) {
  const f = primeira ? ' first' : '';
  return (
    <>
      <div className={`hl${f}`}>{h}h</div>
      {dias.map((d) => {
        const c = celulas[`${d.iso}|${h}`] ?? { estado: 'vazio' };
        return (
          <div key={d.iso} className={`c${f}${c.estado === 'vazio' ? ' past' : ''}${d.iso === sel ? ' sel-col' : ''}`}>
            <Bloco c={c} />
          </div>
        );
      })}
    </>
  );
}

function Topo({ tema }: { tema: string }) {
  return <span className="evt"><TemaTile tema={tema} size="sm" /><span className="n">{tema}</span></span>;
}

function Bloco({ c }: { c: Celula }) {
  if (c.estado === 'vazio') return null;
  const st = temaVars(c.tema);
  switch (c.estado) {
    case 'off':
      return <div className="ev off" style={st}><Topo tema={c.tema} /></div>;
    case 'cancelada':
      return <div className="ev off" style={st} aria-label={`Cancelada: ${c.label}`}><Topo tema={c.tema} /><span className="ft"><span className="icon">event_busy</span>Cancelada</span></div>;
    case 'ao-vivo':
      return (
        <EntrarAula turmaId={c.id} className="ev live" style={st} label={`Entrar na aula ao vivo: ${c.label}`}>
          <Topo tema={c.tema} /><span className="ft"><span className="dot pulse" />Ao vivo · Entrar</span>
        </EntrarAula>
      );
    case 'inscrito':
      return <div className="ev mine" style={st} aria-label={`Inscrito: ${c.label}`}><Topo tema={c.tema} /><span className="ft"><span className="icon fill">check_circle</span>Inscrito</span></div>;
    default:
      return (
        <AbrirInscricao turmaId={c.id} className="ev" style={st} label={`Inscrever-se em ${c.label}`}>
          <Topo tema={c.tema} /><span className="ft"><span className="icon">add</span>Inscrever-se</span>
        </AbrirInscricao>
      );
  }
}

/** Seletor de semana (muda a URL) */
export function SemanaSelect({ semanas, atual }: { semanas: { value: string; label: string; href: string }[]; atual: string }) {
  const router = useRouter();
  return (
    <label className="sel">
      <span className="sr-only">Escolher semana</span>
      <select value={atual} onChange={(e) => { const s = semanas.find((x) => x.value === e.target.value); if (s) router.push(s.href, { scroll: false }); }}>
        {semanas.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <span className="icon">expand_more</span>
    </label>
  );
}
