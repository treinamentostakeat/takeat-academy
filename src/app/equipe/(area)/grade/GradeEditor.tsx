'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { HORARIOS, TEMA, temaVars, type Tema } from '@/lib/temas';
import { Dropdown } from '@/components/Dropdown';
import { toast } from '@/components/equipe/Toast';
import { salvarGrade } from './acoes';

type Celula = { dia: number; hora: number; tema: string; instrutorId: string; plantaoId: string };
type Pessoa = { id: string; nome: string; ativo: boolean };
type Campo = 'tema' | 'instrutorId' | 'plantaoId';

const DIAS = [1, 2, 3, 4, 5];
const NOME: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };
const k = (d: number, h: number) => `${d}|${h}`;
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const mapa = (l: Celula[]) => Object.fromEntries(l.map((c) => [k(c.dia, c.hora), c])) as Record<string, Celula>;

function Sw({ tema }: { tema: string }) {
  const t = TEMA[tema as Tema];
  if (!t) return <span className="sw" aria-hidden="true" />;
  return (
    <span className="sw" style={temaVars(tema)} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: t.icone }} />
    </span>
  );
}

export function GradeEditor({ inicial, temas, pessoas, valePadrao, minimo }: {
  inicial: Celula[];
  temas: string[];
  pessoas: Pessoa[];
  valePadrao: string;
  minimo: string;
}) {
  const [salvo, setSalvo] = useState(() => mapa(inicial));
  const [rasc, setRasc] = useState(() => mapa(inicial));
  const [vale, setVale] = useState(valePadrao);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [pend, start] = useTransition();

  const mudou = (c: Celula, o: Celula) => ({ tema: c.tema !== o.tema, instrutorId: c.instrutorId !== o.instrutorId, plantaoId: c.plantaoId !== o.plantaoId });
  const alteradas = useMemo(() => Object.keys(rasc).filter((x) => { const m = mudou(rasc[x], salvo[x]); return m.tema || m.instrutorId || m.plantaoId; }).length, [rasc, salvo]);

  useEffect(() => {
    if (!alteradas) return;
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [alteradas]);

  const contar = (src: Record<string, Celula>) => {
    const tema: Record<string, number> = Object.fromEntries(temas.map((t) => [t, 0]));
    const aula: Record<string, number> = {}, plant: Record<string, number> = {};
    Object.values(src).forEach((c) => {
      tema[c.tema] = (tema[c.tema] || 0) + 1;
      aula[c.instrutorId] = (aula[c.instrutorId] || 0) + 1;
      plant[c.plantaoId] = (plant[c.plantaoId] || 0) + 1;
    });
    return { tema, aula, plant };
  };
  const agora = contar(rasc), antes = contar(salvo);
  const total = Object.values(agora.tema).reduce((a, b) => a + b, 0);
  const maxTema = Math.max(1, ...Object.values(agora.tema));
  const temasOrd = [...temas].sort((a, b) => agora.tema[b] - agora.tema[a]);
  // Pessoas no resumo: ativas e quem ainda aparece na grade
  const noResumo = pessoas.filter((p) => p.ativo || agora.aula[p.id] || agora.plant[p.id] || antes.aula[p.id] || antes.plant[p.id]);

  const alterar = (d: number, h: number, campo: Campo, valor: string) => {
    setRasc((r) => ({ ...r, [k(d, h)]: { ...r[k(d, h)], [campo]: valor } }));
    setAviso(null);
  };
  const descartar = () => { setRasc(salvo); setErro(''); toast('Alterações descartadas.', 'undo'); };
  const salvar = () => {
    setErro('');
    if (!vale) { setErro('Escolha a data a partir da qual a grade vale.'); document.getElementById('vale')?.focus(); return; }
    if (vale < minimo) { setErro('Escolha uma data a partir de amanhã.'); document.getElementById('vale')?.focus(); return; }
    if (!alteradas) { toast('Nenhuma alteração para salvar.', 'info'); return; }
    start(async () => {
      try {
        const r = await salvarGrade({ valeDesde: vale, celulas: Object.values(rasc) });
        if (!r.ok) { setErro(r.erro); return; }
        setSalvo(rasc);
        const partes = [`Grade salva. Vale a partir de ${ddmm(r.valeDesde)}.`];
        if (r.atualizadas) partes.push(`${r.atualizadas} ${r.atualizadas === 1 ? 'turma já gerada foi atualizada' : 'turmas já geradas foram atualizadas'}.`);
        if (r.mantidas) partes.push(`${r.mantidas} com inscritos ${r.mantidas === 1 ? 'ficou como estava' : 'ficaram como estavam'}.`);
        toast(partes.join(' '));
        setAviso(r.mantidas
          ? `${r.mantidas} ${r.mantidas === 1 ? 'turma a partir de' : 'turmas a partir de'} ${ddmm(r.valeDesde)} já ${r.mantidas === 1 ? 'tinha' : 'tinham'} inscritos e ${r.mantidas === 1 ? 'ficou' : 'ficaram'} com a escala anterior. Se precisar, ajuste cada uma na agenda (Trocar instrutor).`
          : null);
      } catch {
        setErro('Não foi possível salvar. Tente de novo.');
      }
    });
  };

  const delta = (a: number, b: number) => {
    const x = a - b;
    return x ? <span className={`d ${x > 0 ? 'up' : 'dn'}`}>{x > 0 ? '+' : '−'}{Math.abs(x)}</span> : null;
  };
  const opPessoas = pessoas.map((p) => ({ value: p.id, label: p.nome, disabled: !p.ativo }));
  const opTemas = temas.map((t) => ({ value: t, label: t }));

  return (
    <>
      <div className="foot-bar">
        <div className="fld">
          <label htmlFor="vale">Vale a partir de</label>
          <input type="date" id="vale" value={vale} min={minimo} onChange={(e) => setVale(e.target.value)} aria-describedby="vale-info" />
          <div className="info" id="vale-info">Turmas sem inscritos a partir dessa data seguem a nova grade.</div>
        </div>
        <div className="acts">
          <span className="chgcount" aria-live="polite">{alteradas ? <><b>{alteradas} {alteradas === 1 ? 'turma alterada' : 'turmas alteradas'}</b> e não salvas</> : 'Nenhuma alteração'}</span>
          <button type="button" className="btn btn-l btn-outlined" disabled={!alteradas || pend} onClick={descartar}>Descartar alterações</button>
          <button type="button" className="btn btn-l btn-filled" disabled={pend} onClick={salvar}>{pend ? 'Salvando…' : 'Salvar grade'}</button>
        </div>
      </div>
      {erro && <div className="gr-err" role="alert"><span className="icon">error</span>{erro}</div>}
      {aviso && <div className="notice gr-note" role="status"><span className="icon">info</span><div>{aviso}</div></div>}

      <div className="gr-layout">
        <div className="gr-scroll">
          <div className="gr" role="grid" aria-label="Grade modelo da semana">
            <div className="hd corner"><span className="sr-only">Horário</span></div>
            {DIAS.map((d) => <div key={d} className="hd col">{NOME[d]}</div>)}
            {HORARIOS.map((h, ri) => {
              const last = ri === HORARIOS.length - 1 ? ' last' : '';
              return [
                <div key={`h${h}`} className={`hr${last}`}>{h}h</div>,
                ...DIAS.map((d, di) => {
                  const c = rasc[k(d, h)], o = salvo[k(d, h)];
                  if (!c || !o) return <div key={k(d, h)} className={`cell${last}`} />;
                  const m = mudou(c, o);
                  const alg = m.tema || m.instrutorId || m.plantaoId;
                  const rot = `${NOME[d]} ${h}h`;
                  return (
                    <div key={k(d, h)} className={`cell${last}`} style={{ '--o': di * 10 + ri } as React.CSSProperties}>
                      <span className="dl">{NOME[d]}, {h}h</span>
                      <div className={`gc${alg ? ' chg' : ''}`}>
                        <span className="tag">Alterada</span>
                        <div className="row tema">
                          <Sw tema={c.tema} />
                          <Dropdown ariaLabel={`Tema, ${rot}`} className={m.tema ? 'chg' : ''} value={c.tema} opcoes={opTemas} onChange={(v) => alterar(d, h, 'tema', v)} />
                        </div>
                        <div className="row"><span>Aula</span>
                          <Dropdown ariaLabel={`Instrutor da aula, ${rot}`} className={m.instrutorId ? 'chg' : ''} value={c.instrutorId} opcoes={opPessoas} onChange={(v) => alterar(d, h, 'instrutorId', v)} />
                        </div>
                        <div className="row"><span>Plantão</span>
                          <Dropdown ariaLabel={`Plantão, ${rot}`} className={m.plantaoId ? 'chg' : ''} value={c.plantaoId} opcoes={opPessoas} onChange={(v) => alterar(d, h, 'plantaoId', v)} />
                        </div>
                        {c.instrutorId === c.plantaoId && <div className="warn"><span className="icon s16">warning</span>Mesma pessoa na aula e no plantão</div>}
                        {pessoas.some((p) => !p.ativo && (p.id === c.instrutorId || p.id === c.plantaoId)) && <div className="warn"><span className="icon s16">person_off</span>Pessoa desativada: troque</div>}
                      </div>
                    </div>
                  );
                }),
              ];
            })}
          </div>
        </div>

        <aside className="gr-side">
          <section className="mod">
            <div className="mod-h"><div><h2>Turmas por tema</h2><p>Por semana, com a grade como está na tela.</p></div></div>
            <div className="sum-l">
              {temasOrd.map((t) => (
                <div key={t} className="sum-r" style={temaVars(t)}>
                  <Sw tema={t} />
                  <span>{t}</span>
                  <span className="n">{agora.tema[t]}{delta(agora.tema[t], antes.tema[t])}</span>
                  <span className="sbar"><i style={{ width: `${(agora.tema[t] / maxTema) * 100}%` }} /></span>
                </div>
              ))}
            </div>
            <div className="sum-tot"><span>Total</span><span>{total} turmas</span></div>
          </section>
          <section className="mod">
            <div className="mod-h"><div><h2>Por instrutor</h2><p>Aulas e horários de plantão na semana.</p></div></div>
            <table className="pi-t">
              <thead><tr><th scope="col">Instrutor</th><th scope="col" className="num">Aulas</th><th scope="col" className="num">Plantão</th></tr></thead>
              <tbody>
                {noResumo.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td className="num">{agora.aula[p.id] || 0}{delta(agora.aula[p.id] || 0, antes.aula[p.id] || 0)}</td>
                    <td className="num">{agora.plant[p.id] || 0}{delta(agora.plant[p.id] || 0, antes.plant[p.id] || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </aside>
      </div>
    </>
  );
}
