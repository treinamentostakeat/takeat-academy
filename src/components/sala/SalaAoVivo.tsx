'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { TemaTile } from '@/components/TemaTile';
import { iniciais } from '@/lib/formato';
import { encerrarAula, registrarSaida, salvarAvaliacao } from '@/lib/sala';
import AulaDemo from './AulaDemo';
import type { DadosSala, Etapa } from './tipos';
import { useToast } from './useToast';
import './sala-ao-vivo.css';

/* Sala de aula ao vivo (cliente e instrutora): espera → aula → fim, igual ao protótipo sala.html. */

const AulaLiveKit = dynamic(() => import('./AulaLiveKit'), { ssr: false, loading: () => <div className="sala-carregando" role="status">Conectando à aula…</div> });

const ESTRELAS = ['', 'Ruim', 'Fraca', 'Boa', 'Muito boa', 'Excelente'];
const abreAs = (h: number) => `${h - 1}h50`;
const relogio = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
};

type Conexao = { demo: true } | { demo?: false; url: string; token: string };

export function SalaAoVivo({ dados, demoBar }: { dados: DadosSala; demoBar?: React.ReactNode }) {
  const { papel, turma } = dados;
  const inst = papel === 'instrutor';
  const router = useRouter();
  const { el: toastEl, mostrar } = useToast();
  const [etapa, setEtapa] = useState<Etapa>(dados.etapa);
  const [conexao, setConexao] = useState<Conexao | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [entrou, setEntrou] = useState(!!dados.fim?.entrou);
  const [saiu, setSaiu] = useState(false);
  const [dec, setDec] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setDec((d) => d + 1), 1000);
    return () => clearInterval(i);
  }, []);

  /* Altura do topo (faixa demo + cabeçalho) para a sala ocupar o resto da tela */
  useEffect(() => {
    const medir = () => {
      const h = [...document.querySelectorAll<HTMLElement>('.demo-bar, .top')].reduce((a, e) => a + e.offsetHeight, 0);
      document.documentElement.style.setProperty('--chrome', `${h}px`);
    };
    medir();
    addEventListener('resize', medir);
    return () => removeEventListener('resize', medir);
  }, [etapa]);

  const paraComecar = dados.segParaComecar - dec;
  const aberta = dados.segParaAbrir - dec <= 0;

  async function entrar() {
    setEntrando(true);
    try {
      const r = await fetch('/api/sala/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turmaId: turma.id, papel }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { mostrar(j.erro || 'Não foi possível entrar na aula.', 'error'); return; }
      setConexao(j.demo ? { demo: true } : { url: j.url, token: j.token });
      setEntrou(true);
      setEtapa('aula');
      if (inst && !turma.iniciada) mostrar('Aula aberta. Os clientes já podem entrar.', 'play_arrow');
    } catch {
      mostrar('Sem conexão. Confira sua internet e tente de novo.', 'error');
    } finally { setEntrando(false); }
  }

  const sair = useCallback(async () => {
    setConexao(null);
    setSaiu(true);
    setEtapa('fim');
    await registrarSaida(turma.id, papel).catch(() => {});
  }, [turma.id, papel]);
  const encerrar = useCallback(async () => {
    const r = await encerrarAula(turma.id);
    if (!r.ok) { mostrar(r.erro, 'error'); return; }
    setConexao(null);
    router.refresh(); // o servidor devolve a etapa "fim" com os números da aula
  }, [turma.id, router, mostrar]);
  const encerrada = useCallback(() => { setConexao(null); setSaiu(false); setEtapa('fim'); }, []);
  const erro = useCallback((msg: string) => mostrar(msg, 'error'), [mostrar]);
  const queda = useCallback((msg: string) => { setConexao(null); setEtapa('espera'); mostrar(msg, 'error'); }, [mostrar]);

  /* ---------- Topo ---------- */
  const topo = (pessoas: number) => (
    <>
      {demoBar}
      <header className="top">
        <div className="top-in">
          <Link className="brand" href={inst ? '/equipe/agenda' : '/'} aria-label={inst ? 'Takeat Academy, voltar à agenda' : 'Takeat Academy, voltar ao início'}>
            <img src="/brand/takeat-logo.svg" alt="Takeat" /><span>Academy</span>
          </Link>
          <div className="class-id">
            <TemaTile tema={turma.tema} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div className="n">{turma.tema}</div>
              <div className="m">{turma.horario}{etapa === 'espera' ? ' · Sala de espera' : etapa === 'fim' && !saiu ? ' · Encerrada' : ''}</div>
            </div>
          </div>
          <div className="top-r">
            {inst && <span className="role-tag"><span className="icon s16">school</span>Você é a instrutora</span>}
            {etapa === 'espera' && <span className="chip chip-yellow"><span className="icon s16">schedule</span>Começa às {turma.hora}h</span>}
            {etapa === 'aula' && <><span className="chip chip-red"><span className="dot pulse" />Ao vivo</span><span className="people"><span className="icon">group</span>{pessoas} na sala</span></>}
            {etapa === 'fim' && <span className="chip chip-neutral">{saiu ? 'Você saiu da aula' : 'Aula encerrada'}</span>}
          </div>
        </div>
      </header>
    </>
  );

  /* ---------- Aula ---------- */
  if (etapa === 'aula' && conexao) {
    const comum = { papel, turmaId: turma.id, seg0: -paraComecar, onSair: sair, onEncerrar: encerrar, onEncerrada: encerrada, topo };
    return (
      <>
        {conexao.demo
          ? <AulaDemo {...comum} />
          : <AulaLiveKit {...comum} url={conexao.url} token={conexao.token} onErro={erro} onQueda={queda} />}
        {toastEl}
      </>
    );
  }

  /* ---------- Fim ---------- */
  if (etapa === 'aula') {
    // instrutora encerrou: aguardando o servidor devolver os números da aula
    return <>{topo(0)}<div className="sala-carregando" role="status">Encerrando a aula…</div>{toastEl}</>;
  }
  if (etapa === 'fim') {
    return (
      <>
        {topo(0)}
        <main className="rate">
          {inst ? <FimInstrutora dados={dados} /> : <FimCliente dados={dados} entrou={entrou} saiu={saiu} />}
        </main>
        {toastEl}
      </>
    );
  }

  /* ---------- Espera ---------- */
  const n = dados.inscritos.length;
  const contagem = paraComecar <= 0
    ? { v: 'Ao vivo', l: 'a aula já começou', longe: false }
    : paraComecar >= 86400
      ? { v: `${Math.floor(paraComecar / 86400)} ${Math.floor(paraComecar / 86400) === 1 ? 'dia' : 'dias'}`, l: 'para a aula começar', longe: true }
      : { v: relogio(paraComecar), l: inst ? 'para o horário da aula' : 'para a aula começar', longe: false };
  const progresso = Math.min(1, Math.max(0, 1 - paraComecar / 600));
  const outros = inst ? n : Math.max(0, n - 1);

  return (
    <>
      {topo(0)}
      <main className="wait">
        <section className="card wait-main" aria-labelledby="w-tema">
          <TemaTile tema={turma.tema} size="lg" />
          <h1 className="tema" id="w-tema">{turma.tema}</h1>
          <p className="when">Aula ao vivo · {turma.horario.replace(/^Hoje/, 'hoje')}</p>
          <div className="count" aria-live="off"><b className={contagem.longe ? 'longe' : undefined}>{contagem.v}</b></div>
          <div className="count-l">{contagem.l}</div>
          <div className="bar" aria-hidden="true"><i style={{ transform: `scaleX(${progresso})` }} /></div>
          <div className="waiting-n">
            {n > 0 && (
              <span className="avatars" aria-hidden="true">
                {dados.inscritos.slice(0, 3).map((p, i) => (
                  <span className="av" key={p.id} style={[{ background: 'var(--teal-tint)', color: 'var(--teal-ink)' }, { background: 'var(--blue-tint)', color: 'var(--blue-ink)' }, { background: 'var(--yellow-tint)', color: 'var(--yellow-ink)' }][i]}>{iniciais(p.nome)}</span>
                ))}
              </span>
            )}
            <span>
              {inst
                ? (n ? `${n} ${n === 1 ? 'pessoa inscrita' : 'pessoas inscritas'} nesta aula` : 'Ninguém inscrito ainda')
                : (outros ? `Você e mais ${outros} ${outros === 1 ? 'pessoa inscrita' : 'pessoas inscritas'}` : 'Você é a primeira pessoa inscrita')}
            </span>
          </div>
          {!inst && (
            <>
              <div className="me-row">
                <span className="av me">{iniciais(dados.eu.nome)}</span>
                <div><div className="n">{dados.eu.nome}</div><div className="c">{dados.eu.restaurante} · você entra com o microfone desligado</div></div>
              </div>
              <button type="button" className="btn btn-l btn-filled btn-block" disabled={!aberta || entrando} onClick={entrar}>
                <span className="icon">login</span><span>{entrando ? 'Entrando…' : aberta ? 'Entrar na aula' : `A sala abre às ${abreAs(turma.hora)}`}</span>
              </button>
              <p className="hint">O botão libera sozinho 10 minutos antes da aula.</p>
            </>
          )}
          {inst && (
            <>
              <button type="button" className="btn btn-l btn-filled btn-block" disabled={!aberta || entrando} onClick={entrar}>
                <span className="icon">play_arrow</span>
                <span>{entrando ? 'Abrindo…' : !aberta ? `A sala abre às ${abreAs(turma.hora)}` : turma.iniciada ? 'Voltar para a aula' : 'Abrir a aula para todos'}</span>
              </button>
              <p className="hint">Os clientes podem entrar a partir de 10 minutos antes do horário.</p>
            </>
          )}
        </section>

        <div className="side-stack">
          {!inst && <Preparo />}
          {!inst && (
            <div className="notice" role="note">
              <span className="icon s24">back_hand</span>
              <div><b>Quer falar durante a aula?</b>Levante a mão. Quando a instrutora liberar, seu microfone liga e todos te ouvem. O chat fica aberto o tempo todo.</div>
            </div>
          )}
          {inst && (
            <section className="card blk" aria-labelledby="h-iprep">
              <h2 id="h-iprep"><span className="icon s24">checklist</span>Antes de abrir</h2>
              <ul className="checks">
                <li className={dados.livekit ? '' : 'ok'}><span className="ic"><span className="icon">mic</span></span><div><div className="t">Microfone e câmera</div><div className="d">{dados.livekit ? 'O navegador pede permissão quando você abrir a aula.' : 'Vídeo desligado no modo demonstração.'}</div></div></li>
                <li><span className="ic"><span className="icon">screen_share</span></span><div><div className="t">Compartilhar a tela do sistema</div><div className="d">Depois de abrir, toque em Tela e escolha a janela do sistema Takeat.</div></div></li>
                <li><span className="ic"><span className="icon">back_hand</span></span><div><div className="t">Mãos levantadas</div><div className="d">Na aba Mãos, toque em Liberar para o cliente falar.</div></div></li>
              </ul>
            </section>
          )}
          {inst && (
            <section className="card blk" aria-labelledby="h-insc">
              <h2 id="h-insc"><span className="icon s24">group</span>Inscritos</h2>
              {n ? (
                <ul className="plist">
                  {dados.inscritos.map((p) => (
                    <li key={p.id}><span className="av">{iniciais(p.nome)}</span><div className="txt"><div className="n">{p.nome}</div><div className="c">{p.restaurante}</div></div></li>
                  ))}
                </ul>
              ) : <p>Ninguém se inscreveu nesta aula ainda.</p>}
            </section>
          )}
        </div>
      </main>
      {toastEl}
    </>
  );
}

/* Cliente: teste de som antes de entrar */
function Preparo() {
  const [testado, setTestado] = useState(false);
  function tocar() {
    try {
      const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 660; g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.85);
    } catch { /* navegador sem áudio */ }
    setTestado(true);
  }
  return (
    <section className="card blk" aria-labelledby="h-prep">
      <h2 id="h-prep"><span className="icon s24">checklist</span>Prepare-se</h2>
      <ul className="checks">
        <li className={testado ? 'ok' : ''}>
          <span className="ic"><span className="icon">volume_up</span></span>
          <div>
            <div className="t">Teste o som</div><div className="d">Confira se você vai ouvir a instrutora.</div>
            <button type="button" className="btn btn-m btn-outlined" onClick={tocar}><span className="icon">{testado ? 'check' : 'play_arrow'}</span>{testado ? 'Som testado' : 'Tocar som de teste'}</button>
          </div>
        </li>
        <li className="ok"><span className="ic"><span className="icon">computer</span></span><div><div className="t">Deixe o sistema Takeat aberto</div><div className="d">Assim você acompanha a aula fazendo junto.</div></div></li>
      </ul>
    </section>
  );
}

/* Cliente: avaliação ao fim da aula */
function FimCliente({ dados, entrou, saiu }: { dados: DadosSala; entrou: boolean; saiu: boolean }) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(!!dados.fim?.avaliou);
  const { turma } = dados;

  const acoes = (
    <div className="actions">
      <Link className="btn btn-l btn-filled btn-block" href="/aulas"><span className="icon">event_available</span>Inscrever-se em outra aula</Link>
      <Link className="btn btn-l btn-outlined btn-block" href="/">Voltar ao início</Link>
    </div>
  );

  if (!entrou) {
    return (
      <section className="card done" style={{ padding: 32 }}>
        <div className="aviso-ic neutro"><span className="icon">event_busy</span></div>
        <h1>Esta aula já terminou</h1>
        <p>Você não chegou a entrar nesta aula de {turma.tema}. Escolha outro horário para participar.</p>
        {acoes}
      </section>
    );
  }
  if (feito) {
    return (
      <section className="card done" style={{ padding: 32 }}>
        <div className="badge-ok"><span className="icon fill">check_circle</span></div>
        <h1>Obrigado pela avaliação!</h1>
        <p>Sua opinião ajuda a melhorar os próximos treinamentos.</p>
        {acoes}
      </section>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nota) { setErro('Escolha de 1 a 5 estrelas para enviar.'); return; }
    setEnviando(true);
    const r = await salvarAvaliacao(turma.id, nota, comentario).catch(() => ({ ok: false as const, erro: 'Sem conexão. Tente de novo.' }));
    setEnviando(false);
    if (r.ok) setFeito(true); else setErro(r.erro);
  }
  const v = hover || nota;
  return (
    <section className="card">
      <form onSubmit={enviar} noValidate>
        <div className="rate-h"><TemaTile tema={turma.tema} size="lg" /><h1>{saiu ? 'Como foi a aula?' : 'A aula terminou! Como foi?'}</h1><p>{turma.tema} · {turma.horario.replace(/^Hoje/, 'hoje')}</p></div>
        <div className="stars" role="radiogroup" aria-label="Nota de 1 a 5 estrelas" onMouseLeave={() => setHover(0)}
          onKeyDown={(e) => {
            if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault();
            const nv = Math.max(1, Math.min(5, nota + (e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : -1)));
            setNota(nv); setErro('');
            (e.currentTarget.querySelector(`[data-v="${nv}"]`) as HTMLElement | null)?.focus();
          }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" data-v={i} className={`star${i <= v ? ' on' : ''}`} role="radio" aria-checked={nota === i}
              aria-label={`${i} ${i === 1 ? 'estrela' : 'estrelas'}: ${ESTRELAS[i]}`} tabIndex={nota ? (nota === i ? 0 : -1) : i === 1 ? 0 : -1}
              onClick={() => { setNota(i); setErro(''); }} onMouseEnter={() => setHover(i)}>
              <span className="icon">star</span>
            </button>
          ))}
        </div>
        <div className="star-l" aria-live="polite">{v ? ESTRELAS[v] : 'Toque nas estrelas para dar sua nota'}</div>
        <label className="lbl" htmlFor="r-com">Quer deixar um comentário? <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(opcional)</span></label>
        <textarea className="txa" id="r-com" placeholder="O que foi bom e o que podemos melhorar?" maxLength={1000} value={comentario} onChange={(e) => setComentario(e.target.value)} />
        {erro && <p className="errmsg" role="alert">{erro}</p>}
        <div className="actions">
          <button className="btn btn-l btn-filled btn-block" disabled={enviando}><span className="icon">send</span>{enviando ? 'Enviando…' : 'Enviar avaliação'}</button>
        </div>
      </form>
    </section>
  );
}

/* Instrutora: números da aula encerrada */
function FimInstrutora({ dados }: { dados: DadosSala }) {
  const r = dados.resumo;
  const { turma } = dados;
  return (
    <section className="card done" style={{ padding: 32 }}>
      <span style={{ display: 'inline-block' }}><TemaTile tema={turma.tema} size="lg" /></span>
      <h1 style={{ marginTop: 16 }}>{turma.iniciada ? 'Aula encerrada' : 'Esta aula não foi aberta'}</h1>
      <p>{turma.tema} · {turma.horario.replace(/^Hoje/, 'hoje')}</p>
      <div className="stats">
        <div className="stat"><div className="k">Inscritos</div><div className="v">{r?.inscritos ?? 0}</div></div>
        <div className="stat"><div className="k">Presentes</div><div className="v">{r?.presentes ?? 0}</div></div>
        <div className="stat"><div className="k">Dúvidas tiradas</div><div className="v">{r?.duvidas ?? 0}</div></div>
        <div className="stat"><div className="k">Duração</div><div className="v">{r?.duracaoMin ? `${r.duracaoMin} min` : '—'}</div></div>
      </div>
      <div className="actions"><Link className="btn btn-l btn-outlined btn-block" href="/equipe/agenda">Voltar à agenda</Link></div>
    </section>
  );
}
