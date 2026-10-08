import Link from 'next/link';
import { Suspense } from 'react';
import { exigirUsuario, type UsuarioSessao } from '@/lib/sessao';
import { agora, diaSemana, faixa, hoje, parse, rotuloCurto, rotuloDia, rotuloSemana, segundaDe, somaDias } from '@/lib/datas';
import { HORARIOS, temaVars } from '@/lib/temas';
import { agendaDoPeriodo, primeiroNome, fmt1, type Sit, type TurmaAgenda } from '@/lib/equipe';
import { ChipSit, rotuloSit } from './pecas';
import { TemaTile } from '@/components/TemaTile';
import { Toaster } from '@/components/equipe/Toast';
import { DetalheTurma, DrawerCarregando } from './DetalheTurma';
import './agenda.css';

export const metadata = { title: 'Agenda' };

type SP = { visao?: string; data?: string; turma?: string; negado?: string };
type Visao = 'semana' | 'dia';

const dataValida = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime());

export default async function Agenda({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await exigirUsuario();
  const sp = await searchParams;
  const hj = hoje();
  const visao: Visao = sp.visao === 'dia' ? 'dia' : 'semana';
  const data = dataValida(sp.data) ? sp.data! : hj;
  const turmaId = sp.turma && /^[a-z0-9]{8,40}$/i.test(sp.turma) ? sp.turma : null;

  const url = (o: { visao?: Visao; data?: string; turma?: string | null } = {}) => {
    const p = new URLSearchParams();
    const v = o.visao ?? visao, d = o.data ?? data;
    if (v === 'dia') p.set('visao', 'dia');
    if (d !== hj) p.set('data', d);
    if (o.turma) p.set('turma', o.turma);
    const s = p.toString();
    return '/equipe/agenda' + (s ? `?${s}` : '');
  };

  const seg = segundaDe(data);
  let anterior: string, proximo: string;
  if (visao === 'semana') { anterior = somaDias(seg, -7); proximo = somaDias(seg, 7); }
  else {
    anterior = somaDias(data, -1); while ([0, 6].includes(diaSemana(anterior))) anterior = somaDias(anterior, -1);
    proximo = somaDias(data, 1); while ([0, 6].includes(diaSemana(proximo))) proximo = somaDias(proximo, 1);
  }
  const semanaAtual = seg === segundaDe(hj);
  const periodo = visao === 'semana'
    ? { t: rotuloSemana(seg), s: semanaAtual ? 'Esta semana' : seg > hj ? 'Semana futura' : 'Semana passada' }
    : { t: rotuloDia(data), s: data === hj ? 'Hoje' : data > hj ? 'Dia futuro' : 'Dia passado' };
  const gestor = u.cargo === 'gestor';

  return (
    <div className="ag">
      {sp.negado && (
        <div className="notice ag-neg" role="alert">
          <span className="icon">lock</span>
          <div><b>Esta área é do gestor</b>Você foi trazido de volta para a agenda. Fale com o gestor se precisar desse acesso.</div>
        </div>
      )}
      <div className="rp-head">
        <div>
          <h1>Agenda</h1>
          <p>Turmas ao vivo e escala do plantão.</p>
        </div>
        {gestor && (
          <div className="rp-actions">
            <Link className="btn btn-l btn-outlined" href="/equipe/grade"><span className="icon">view_week</span>Editar grade modelo</Link>
          </div>
        )}
      </div>

      <div className="ag-bar">
        <span className="seg" role="group" aria-label="Visão">
          <Link href={url({ visao: 'semana' })} aria-pressed={visao === 'semana'} role="button" scroll={false}>Semana</Link>
          <Link href={url({ visao: 'dia' })} aria-pressed={visao === 'dia'} role="button" scroll={false}>Dia</Link>
        </span>
        <span className="ag-nav">
          <Link className="navb" href={url({ data: anterior })} aria-label={visao === 'semana' ? 'Semana anterior' : 'Dia anterior'} scroll={false}><span className="icon">chevron_left</span></Link>
          <Link className="navb" href={url({ data: proximo })} aria-label={visao === 'semana' ? 'Próxima semana' : 'Próximo dia'} scroll={false}><span className="icon">chevron_right</span></Link>
        </span>
        <Link className="btn btn-l btn-outlined" href={url({ data: hj })} scroll={false}>Hoje</Link>
        <div className="ag-per" aria-live="polite">{periodo.t}<small>{periodo.s}</small></div>
        <div className="ag-legend" aria-hidden="true">
          <span className="lg"><i className="sw-fut" />Agendada (cor do tema)</span>
          <span className="lg"><i className="sw-live" />Ao vivo</span>
          <span className="lg"><i className="sw-past" />Realizada</span>
          <span className="lg"><i className="sw-canc" />Cancelada</span>
        </div>
      </div>

      <Suspense key={`${visao}|${data}`} fallback={<AgendaCarregando />}>
        {visao === 'semana'
          ? <Semana seg={seg} u={u} url={(id) => url({ turma: id })} hojeUrl={url({ data: hj })} />
          : <Dia data={data} u={u} url={(id) => url({ turma: id })} hojeUrl={url({ data: hj })} />}
      </Suspense>

      {turmaId && (
        <Suspense key={turmaId} fallback={<DrawerCarregando fecharHref={url()} />}>
          <DetalheTurma id={turmaId} u={u} fecharHref={url()} />
        </Suspense>
      )}
      <Toaster />
    </div>
  );
}

/* ---------- Peças ---------- */

function Quem({ p, u }: { p: { id: string; nome: string }; u: UsuarioSessao }) {
  return p.id === u.id ? <b className="you">Você</b> : <b>{primeiroNome(p.nome)}</b>;
}

function Vazio({ titulo, texto, hojeUrl }: { titulo: string; texto: string; hojeUrl: string }) {
  return (
    <div className="tcard">
      <div className="state">
        <span className="icon">event_busy</span>
        <b>{titulo}</b>
        <p>{texto}</p>
        <div className="acts"><Link className="btn btn-l btn-outlined" href={hojeUrl} scroll={false}>Ir para hoje</Link></div>
      </div>
    </div>
  );
}

function AgendaCarregando() {
  return (
    <div className="wk-scroll" aria-busy="true" aria-label="Carregando agenda">
      <div className="sk-wk">
        {Array.from({ length: 6 }, (_, i) => <div key={`s${i}`} className="sk s" />)}
        {Array.from({ length: 18 }, (_, i) => <div key={i} className="sk" />)}
      </div>
    </div>
  );
}

type PropsVisao = { u: UsuarioSessao; url: (turmaId: string) => string; hojeUrl: string };

async function Semana({ seg, u, url, hojeUrl }: PropsVisao & { seg: string }) {
  const dias = [0, 1, 2, 3, 4].map((i) => somaDias(seg, i));
  const turmas = await agendaDoPeriodo(dias[0], dias[4]);
  if (!turmas.length) {
    return <Vazio titulo="Nenhuma turma nesta semana" texto="Não há turmas registradas nesta semana. A agenda fica aberta até 31 de dezembro de 2026." hojeUrl={hojeUrl} />;
  }
  const n = agora();
  const linhaAgora = dias.includes(n.data) ? Math.floor(n.hora) : null;
  const porChave = new Map(turmas.map((t) => [`${t.data}|${t.hora}`, t]));
  return (
    <div className="wk-scroll">
      <div className="wk" role="grid" aria-label="Turmas da semana">
        <div className="hd" role="columnheader"><span className="sr-only">Horário</span></div>
        {dias.map((d) => {
          const td = d === n.data;
          return (
            <div key={d} className={`hd${td ? ' today' : ''}`} role="columnheader">
              {rotuloDia(d).split(',')[0]}<span className="d">{rotuloCurto(d).split(', ')[1]}{td ? ' · hoje' : ''}</span>
            </div>
          );
        })}
        {HORARIOS.map((h, ri) => {
          const last = ri === HORARIOS.length - 1 ? ' last' : '';
          return [
            <div key={`h${h}`} className={`hr${last}${linhaAgora === h ? ' now' : ''}`} role="rowheader">{h}h</div>,
            ...dias.map((d) => {
              const t = porChave.get(`${d}|${h}`);
              return (
                <div key={`${d}${h}`} className={`cell${last}${d === n.data ? ' today' : ''}${t?.sit === 'realizada' ? ' pastc' : ''}`} role="gridcell">
                  {t && <Bloco t={t} u={u} href={url(t.id)} />}
                </div>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

const clsSit = (s: Sit) => (s === 'realizada' ? ' past' : s === 'ao-vivo' ? ' live' : s === 'cancelada' ? ' canc' : '');

function Bloco({ t, u, href }: { t: TurmaAgenda; u: UsuarioSessao; href: string }) {
  const meu = t.instrutorId === u.id || t.plantaoId === u.id;
  return (
    <Link
      className={`tb${meu ? ' mine' : ''}${clsSit(t.sit)}`}
      style={temaVars(t.tema)}
      href={href}
      scroll={false}
      prefetch={false}
      data-abre={t.id}
      aria-label={`${t.tema}, ${rotuloCurto(t.data)} às ${t.hora}h, ${rotuloSit(t.sit)}`}
    >
      <span className="tb-top"><TemaTile tema={t.tema} size="sm" /><span className="tm">{t.tema}</span></span>
      <span className="ln">Aula: <Quem p={t.instrutor} u={u} /></span>
      <span className="ln">Plantão: <Quem p={t.plantao} u={u} /></span>
      <span className="ft">
        <span className="ins"><span className="icon s16">group</span><b>{t.inscritos}</b><span className="sr-only"> inscritos</span></span>
        <ChipSit sit={t.sit} />
      </span>
    </Link>
  );
}

async function Dia({ data, u, url, hojeUrl }: PropsVisao & { data: string }) {
  const w = diaSemana(data);
  if (w === 0 || w === 6) return <Vazio titulo="Sem turmas neste dia" texto="As turmas ao vivo acontecem de segunda a sexta." hojeUrl={hojeUrl} />;
  const turmas = await agendaDoPeriodo(data, data);
  if (!turmas.length) return <Vazio titulo="Nenhuma turma neste dia" texto="Não há turmas registradas neste dia. A agenda fica aberta até 31 de dezembro de 2026." hojeUrl={hojeUrl} />;
  const v = (x: React.ReactNode | null) => (x === null ? <span className="dim">—</span> : x);
  return (
    <div className="day-grid">
      <div className="dl">
        {turmas.map((t) => {
          const meu = t.instrutorId === u.id || t.plantaoId === u.id;
          const feita = t.sit === 'realizada';
          return (
            <Link key={t.id} className={`dc${meu ? ' mine' : ''}${t.sit === 'ao-vivo' ? ' now' : ''}${t.sit === 'cancelada' ? ' canc' : ''}`} href={url(t.id)} scroll={false} prefetch={false} data-abre={t.id}>
              <span className="h">{t.hora}h<small>até {t.hora + 1}h</small></span>
              <span className="body">
                <span className="dc-top">
                  <span className="id">
                    <TemaTile tema={t.tema} size="sm" />
                    <span>
                      <span className="tm">{t.tema}</span>
                      <span className="who">Aula: <Quem p={t.instrutor} u={u} /> · Plantão: <Quem p={t.plantao} u={u} /></span>
                    </span>
                  </span>
                  <ChipSit sit={t.sit} />
                </span>
                <span className="dm">
                  <span><span className="k">Inscritos</span><span className="v">{t.inscritos}</span></span>
                  <span><span className="k">Presentes</span><span className="v">{v(feita && t.inscritos ? <>{t.presentes} <span className="hint">({Math.round((t.presentes / t.inscritos) * 100)}%)</span></> : feita ? 0 : null)}</span></span>
                  <span><span className="k">Avaliação média</span><span className="v">{v(feita && t.media !== null ? fmt1(t.media) : null)}</span></span>
                  <span><span className="k">Dúvidas tiradas</span><span className="v">{v(feita ? t.maosLiberadas : null)}</span></span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <section className="mod">
        <div className="mod-h"><div><h2>Escala do plantão</h2><p>Quem dá a aula e quem atende o plantão em cada horário.</p></div></div>
        <table className="esc-t">
          <thead><tr><th scope="col">Horário</th><th scope="col">Aula</th><th scope="col">Plantão</th></tr></thead>
          <tbody>
            {turmas.map((t) => (
              <tr key={t.id}>
                <td>{faixa(t.hora).replace(' às ', '–')}</td>
                <td className={t.instrutorId === u.id ? 'you' : ''}>{t.sit === 'cancelada' ? <span className="dim">Cancelada</span> : t.instrutorId === u.id ? 'Você' : t.instrutor.nome}</td>
                <td className={t.plantaoId === u.id ? 'you' : ''}>{t.plantaoId === u.id ? 'Você' : t.plantao.nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
