import Link from 'next/link';
import { Suspense } from 'react';
import { Calendario, SemanaSelect, type Celula, type DiaCal } from '@/components/cliente/Calendario';
import { AbrirInscricao, EntrarAula, InscricaoProvider } from '@/components/cliente/Inscricao';
import { ProximasAulas } from '@/components/cliente/ProximasAulas';
import { diaMinusculo, faixaH, urlCom } from '@/components/cliente/comum';
import { contextoCliente, param, type ParamsCliente } from '@/components/cliente/dados';
import { TemaTile } from '@/components/TemaTile';
import { DIAS_CURTOS, MESES, diaSemana, parse, rotuloSemana, segundaDe, somaDias } from '@/lib/datas';
import { HORARIOS, TEMA, TEMAS, temaPorSlug, temaVars } from '@/lib/temas';
import { FIM_AGENDA } from '@/lib/turmas';
import '@/components/cliente/cliente.css';
import './aulas.css';

export const metadata = { title: 'Aulas ao vivo' };

export default function Aulas({ searchParams }: { searchParams: Promise<ParamsCliente> }) {
  return (
    <main className="page cl cl-aulas">
      <Suspense fallback={<Esqueleto />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Semanas abertas: desta semana até a que contém 31/12 (a última termina em 31/12) */
function semanasAbertas(hoje: string) {
  const out: { inicio: string; fim: string; label: string }[] = [];
  for (let s = segundaDe(hoje); s <= FIM_AGENDA; s = somaDias(s, 7)) {
    const sexta = somaDias(s, 4);
    const fim = sexta > FIM_AGENDA ? FIM_AGENDA : sexta;
    let label = rotuloSemana(s);
    if (fim !== sexta) {
      const a = parse(s), b = parse(fim);
      label = `${a.getUTCDate()}${a.getUTCMonth() !== b.getUTCMonth() ? ' de ' + MESES[a.getUTCMonth()] : ''} a ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]}`;
    }
    out.push({ inicio: s, fim, label });
  }
  return out;
}

async function Conteudo({ searchParams }: { searchParams: Promise<ParamsCliente> }) {
  const sp = await searchParams;
  const { ctx, aoVivo, proximas, cnpjUrl } = await contextoCliente(sp);
  const hoje = ctx.hoje;

  // Estado na URL: tema (slug), semana (segunda ISO); canal e CNPJ do link de origem são preservados
  const tema = temaPorSlug(param(sp, 'tema'));
  const semanas = semanasAbertas(hoje);
  const i = Math.max(0, semanas.findIndex((w) => w.inicio === param(sp, 'semana')));
  const w = semanas[i];
  const fixos = { canal: ctx.canal !== 'avulso' ? ctx.canal : null, cnpj: cnpjUrl };
  const href = (o: { semana?: string | null; tema?: string | null }) => {
    const sem = o.semana !== undefined ? o.semana : i ? w.inicio : null;
    const tm = o.tema !== undefined ? o.tema : tema ? TEMA[tema].slug : null;
    return urlCom('/aulas', { ...fixos, tema: tm, semana: sem === semanas[0].inicio ? null : sem });
  };

  // Células do calendário
  const minhas = new Set(ctx.minhas);
  const dias: DiaCal[] = [];
  for (let d = w.inicio; d <= w.fim; d = somaDias(d, 1)) {
    // ctx.turmas só tem turmas que ainda não aconteceram: dia sem nenhuma já passou
    const passado = d < hoje || !ctx.turmas.some((t) => t.data === d);
    dias.push({ iso: d, wd: DIAS_CURTOS[diaSemana(d)], dt: parse(d).getUTCDate(), hoje: d === hoje, passado });
  }
  const celulas: Record<string, Celula> = {};
  let n = 0;
  for (const t of ctx.turmas) {
    if (t.data < w.inicio || t.data > w.fim) continue;
    const label = `${t.tema}, ${diaMinusculo(t.data, hoje)}, ${faixaH(t.hora)}`;
    const base = { id: t.id, tema: t.tema, label };
    const k = `${t.data}|${t.hora}`;
    if (t.sit === 'cancelada') celulas[k] = { ...base, estado: 'cancelada' };
    else if (tema && t.tema !== tema) celulas[k] = { ...base, estado: 'off' };
    else {
      n++;
      celulas[k] = { ...base, estado: t.sit === 'ao-vivo' ? 'ao-vivo' : minhas.has(t.id) ? 'inscrito' : 'aberta' };
    }
  }

  const cancelada = param(sp, 'cancelada') === '1';
  const linkInvalido = param(sp, 'link') === 'invalido';
  const proxima = semanas[i + 1];

  return (
    <InscricaoProvider ctx={ctx} abrirAoCarregar={param(sp, 'inscrever') === '1'}>
      {cancelada && (
        <div className="aviso" role="status">
          <span className="icon">event_busy</span>
          <div className="txt"><b>Sua aula foi cancelada.</b> Escolha outro horário.</div>
        </div>
      )}
      {linkInvalido && (
        <div className="aviso" role="status">
          <span className="icon">info</span>
          <div className="txt"><b>O link que você abriu tem um CNPJ inválido.</b> Informe o CNPJ do restaurante ao se inscrever.</div>
        </div>
      )}

      <div className="hello">
        <div>
          <h1>Aulas ao vivo</h1>
          <p>Aulas de 1 hora, ao vivo, de segunda a sexta.</p>
        </div>
        <AbrirInscricao tema={tema ?? undefined} className={`btn btn-l ${aoVivo ? 'btn-outlined' : 'btn-filled'}`}>
          <span className="icon">event_available</span>Inscrever-se em uma aula
        </AbrirInscricao>
      </div>

      {aoVivo && (
        <section className="live" aria-label="Aula ao vivo agora" style={temaVars(aoVivo.tema)}>
          <TemaTile tema={aoVivo.tema} />
          <div className="txt">
            <span className="k"><span className="dot pulse" />Ao vivo agora</span>
            <div className="t">{aoVivo.tema}</div>
            <div className="m">
              <span>Hoje · {faixaH(aoVivo.hora)}</span>
              {aoVivo.pessoas > 0 && <>·<span className="icon s16">group</span><span>{aoVivo.pessoas} {aoVivo.pessoas === 1 ? 'pessoa' : 'pessoas'} na sala</span></>}
            </div>
          </div>
          <EntrarAula turmaId={aoVivo.id} className="btn btn-l btn-filled"><span className="icon">login</span>Entrar na aula</EntrarAula>
        </section>
      )}

      <ProximasAulas aulas={proximas} hoje={hoje} />

      <nav className="filters" aria-label="Filtrar por tema">
        <Link className="fchip all" href={href({ tema: null })} aria-current={!tema ? 'true' : undefined} scroll={false}>Todos</Link>
        {TEMAS.map((tm) => (
          <Link key={tm} className="fchip" style={temaVars(tm)} href={href({ tema: TEMA[tm].slug })} aria-current={tema === tm ? 'true' : undefined} scroll={false}>
            <TemaTile tema={tm} size="xs" />{tm}
          </Link>
        ))}
      </nav>

      <div className="wk" role="group" aria-label="Semana">
        {i > 0
          ? <Link className="nb" href={href({ semana: semanas[i - 1].inicio })} aria-label="Semana anterior" scroll={false}><span className="icon">chevron_left</span></Link>
          : <button type="button" className="nb" disabled aria-label="Semana anterior"><span className="icon">chevron_left</span></button>}
        <SemanaSelect
          atual={w.inicio}
          semanas={semanas.map((s, j) => ({ value: s.inicio, label: s.label + (j === 0 ? ' · esta semana' : ''), href: href({ semana: s.inicio }) }))}
        />
        {proxima
          ? <Link className="nb" href={href({ semana: proxima.inicio })} aria-label="Próxima semana" scroll={false}><span className="icon">chevron_right</span></Link>
          : <button type="button" className="nb" disabled aria-label="Próxima semana"><span className="icon">chevron_right</span></button>}
        <span className="n" aria-live="polite">{n ? `${n} ${n === 1 ? 'aula' : 'aulas'}${tema ? ' de ' + tema : ''}` : ''}</span>
        <span className="sp" />
        {i > 0
          ? <Link className="btn btn-m btn-outlined" href={href({ semana: null })} scroll={false}><span className="icon s16">today</span>Esta semana</Link>
          : <button type="button" className="btn btn-m btn-outlined" disabled><span className="icon s16">today</span>Esta semana</button>}
      </div>

      {n ? (
        <Calendario key={w.inicio} dias={dias} horas={HORARIOS} celulas={celulas} rotulo={w.label} />
      ) : (
        <div className="empty-s">
          <span className="icon">event_busy</span>
          <b>Nenhuma aula{tema ? ` de ${tema}` : ''} nesta semana</b>
          {proxima ? 'Veja a próxima semana ou outros temas.' : 'Não há mais aulas abertas até 31 de dezembro.'}
          <div className="acts">
            {proxima && <Link className="btn btn-m btn-outlined" href={href({ semana: proxima.inicio })} scroll={false}><span className="icon s16">chevron_right</span>Ver próxima semana</Link>}
            {tema && <Link className="btn btn-m btn-outlined" href={href({ tema: null })} scroll={false}>Ver todos os temas</Link>}
          </div>
        </div>
      )}
    </InscricaoProvider>
  );
}

function Esqueleto() {
  return (
    <>
      <div className="hello"><div><h1>Aulas ao vivo</h1><p>Aulas de 1 hora, ao vivo, de segunda a sexta.</p></div></div>
      <div className="sk" style={{ height: 40 }} aria-hidden="true" />
      <div className="sk" style={{ height: 560, borderRadius: 16 }} aria-busy="true" aria-label="Carregando calendário" />
    </>
  );
}
