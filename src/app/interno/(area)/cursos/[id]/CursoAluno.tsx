'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { exibicaoDeVideo } from '@/lib/aprendizagem';
import type { CursoAlunoDados } from '@/lib/trilhas';
import { Capa } from '../../pecas';
import { concluirSemQuiz, enviarQuiz, salvarPosicao, type ResultadoQuiz } from './acoes';

/* Curso para quem aprende: visão geral, conteúdo (vídeos e texto), materiais e quiz final.
   Curso sem quiz conclui ao terminar o conteúdo (fim do último vídeo ou botão "Concluir curso"). */

type Secao = 'visao' | 'conteudo' | 'materiais' | 'quiz';

export function CursoAluno({ curso, nome, editar }: { curso: CursoAlunoDados; nome: string; editar: string | null }) {
  const [secao, setSecao] = useState<Secao>('visao');
  const temQuiz = curso.perguntas.length > 0;
  const SECOES: [Secao, string][] = [['visao', 'Visão geral'], ['conteudo', 'Conteúdo'], ['materiais', `Materiais${curso.materiais.length ? ` (${curso.materiais.length})` : ''}`], ['quiz', temQuiz ? 'Quiz final' : 'Conclusão']];
  const ir = (s: Secao) => { setSecao(s); window.scrollTo({ top: 0 }); };
  // Curso sem quiz: conclui ao terminar o conteúdo
  const [concluindo, startConcluir] = useTransition();
  const [erroConcluir, setErroConcluir] = useState('');
  const concluir = () => startConcluir(async () => {
    setErroConcluir('');
    try { const r = await concluirSemQuiz(curso.id); if (!r.ok) setErroConcluir(r.erro ?? 'Não foi possível concluir.'); else ir('quiz'); }
    catch { setErroConcluir('Não foi possível concluir. Confira sua conexão e tente de novo.'); }
  });
  // Fim do último vídeo: vai para o quiz ou, sem quiz, conclui o curso
  const [fimVideos, setFimVideos] = useState(false);
  const aoTerminarVideos = () => { if (temQuiz) { setFimVideos(true); ir('quiz'); } else if (!curso.progresso) concluir(); else ir('quiz'); };
  const proximoPasso = temQuiz
    ? <button type="button" className="btn btn-l btn-filled" onClick={() => ir('quiz')}>Fazer o quiz</button>
    : curso.progresso ? <Seguir curso={curso} />
      : <button type="button" className="btn btn-l btn-filled" disabled={concluindo} onClick={concluir}><span className="icon">check_circle</span>{concluindo ? 'Concluindo…' : 'Concluir curso'}</button>;
  return (
    <div className="in-curso">
      <aside className="in-toc">
        <div className="in-toc-t">Neste curso</div>
        {SECOES.map(([k, l]) => (
          <button key={k} type="button" aria-current={secao === k} onClick={() => setSecao(k)}>
            <span className={`ck${k === 'quiz' && curso.progresso ? ' on' : ''}`} aria-hidden="true"><span className="icon s16">check</span></span>{l}
          </button>
        ))}
        <div className="in-toc-f">Curso {curso.posicao} de {curso.totalCursos} da trilha<br /><Link href={`/interno/trilhas/${curso.trilha.id}`}>{curso.trilha.titulo}</Link></div>
      </aside>
      <div className="in-curso-b">
        <div className="mod in-head">
          <Capa titulo={curso.titulo} etapa={curso.etapa} indiceEtapa={curso.indiceEtapa} imagem={curso.capa} grande />
          <div className="in-chips">
            {curso.area &&<span className="chip chip-neutral">{curso.area}</span>}
            {curso.progresso && <span className="chip chip-teal">{curso.progresso.total ? `Concluído com ${curso.progresso.acertos}/${curso.progresso.total}` : 'Concluído'}</span>}
            {!curso.publicado && <span className="chip chip-yellow">Não publicado</span>}
          </div>
          <h1>{curso.titulo}</h1>
          <nav className="in-cnav" aria-label="Cursos da trilha">
            {curso.anterior
              ? <Link className="btn btn-m btn-outlined" href={`/interno/cursos/${curso.anterior.id}`} title={curso.anterior.titulo}><span className="icon">arrow_back</span>Curso anterior</Link>
              : <span />}
            <span className="in-cnav-p">Curso {curso.posicao} de {curso.totalCursos}</span>
            {curso.proximo
              ? <Link className="btn btn-m btn-outlined" href={`/interno/cursos/${curso.proximo.id}`} title={curso.proximo.titulo}>Próximo curso<span className="icon">arrow_forward</span></Link>
              : <span />}
          </nav>
          {editar && <Link className="btn btn-m btn-outlined in-editar" href={editar}><span className="icon">edit</span>Editar curso</Link>}
        </div>

        {secao === 'visao' && (
          <section className="mod">
            <h2 className="in-h2">Sobre este curso</h2>
            <p className="in-lead">{curso.resumo}</p>
            {curso.aprender.length > 0 && <ul className="in-learn">{curso.aprender.map((a) => <li key={a}><span className="icon s16">check</span>{a}</li>)}</ul>}
            {curso.contato && <p className="in-contato"><b>Com quem falar:</b> {curso.contato}</p>}
            <div className="in-acts">
              {curso.progresso && <Seguir curso={curso} />}
              <button type="button" className={`btn btn-l ${curso.progresso ? 'btn-outlined' : 'btn-filled'}`} onClick={() => ir('conteudo')}>{curso.progresso ? 'Rever conteúdo' : curso.comecado ? 'Continuar curso' : 'Começar curso'}</button>
            </div>
          </section>
        )}

        {secao === 'conteudo' && (
          <section className="mod">
            <h2 className="in-h2">Conteúdo</h2>
            {curso.videos.length > 0 && <Videos videos={curso.videos} posicoes={curso.posicoes} ultimo={curso.ultimoVideo} onFim={aoTerminarVideos} />}
            <div className="in-texto">{curso.texto.split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>
            {curso.contato && <p className="in-contato"><b>Com quem falar:</b> {curso.contato}</p>}
            <div className="in-acts">
              {curso.materiais.length > 0 && <button type="button" className="btn btn-l btn-outlined" onClick={() => ir('materiais')}>Ver materiais</button>}
              {proximoPasso}
            </div>
            {erroConcluir && <p className="err" role="alert">{erroConcluir}</p>}
          </section>
        )}

        {secao === 'materiais' && (
          <section className="mod">
            <h2 className="in-h2">Materiais</h2>
            {curso.materiais.length ? (
              <div className="in-mats">
                {curso.materiais.map((m) => (
                  <a key={m.id} className="in-mat" href={m.url} target="_blank" rel="noopener noreferrer">
                    <span className="icon">description</span><span><b>{m.titulo}</b>{m.descricao && <small>{m.descricao}</small>}</span><span className="icon s16">open_in_new</span>
                  </a>
                ))}
              </div>
            ) : <p className="in-vazio">Este curso ainda não tem materiais.</p>}
            <div className="in-acts">{proximoPasso}</div>
            {erroConcluir && <p className="err" role="alert">{erroConcluir}</p>}
          </section>
        )}

        {secao === 'quiz' && (temQuiz
          ? <>
            {fimVideos && !curso.progresso && <div className="notice in-ok"><span className="icon">task_alt</span><div>Você terminou os vídeos. Agora é o quiz final.</div></div>}
            <Quiz key={curso.id} curso={curso} nome={nome} />
          </>
          : <Conclusao curso={curso} nome={nome} concluindo={concluindo} erro={erroConcluir} onConcluir={concluir} onConteudo={() => ir('conteudo')} />)}
      </div>
    </div>
  );
}

/** Formata segundos como 3:07 ou 1:02:45 */
const tempo = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

/** Endereço do vídeo incorporado com a API ligada (para saber quando termina) e, na passagem automática, já tocando */
function comApi(src: string, tocar: boolean) {
  const u = new URL(src);
  if (/youtube/.test(u.hostname)) { u.searchParams.set('enablejsapi', '1'); u.searchParams.set('rel', '0'); }
  if (tocar && /youtube|vimeo/.test(u.hostname)) u.searchParams.set('autoplay', '1');
  return u.toString();
}

function Videos({ videos, posicoes, ultimo, onFim }: { videos: CursoAlunoDados['videos']; posicoes: Record<string, number>; ultimo: string | null; onFim: () => void }) {
  // Abre no último vídeo que a pessoa assistiu
  const [i, setI] = useState(() => Math.max(0, videos.findIndex((x) => x.id === ultimo)));
  // Passou sozinho para o próximo: ele já começa tocando
  const [tocar, setTocar] = useState(false);
  // Posições conhecidas nesta tela (as do servidor + as salvas agora) e os vídeos que já contam como abertos
  const [pos, setPos] = useState<Record<string, number>>(posicoes);
  const abertos = useRef(new Set(Object.keys(posicoes)));
  const salvoEm = useRef(0);
  // Vídeo incorporado (YouTube, Vimeo…) com foto de capa: mostra a foto até a pessoa clicar em assistir
  const [aberto, setAberto] = useState<string | null>(null);
  const v = videos[Math.min(i, videos.length - 1)];
  const ex = exibicaoDeVideo(v.url);
  const capaAntes = ex?.tipo === 'iframe' && v.capa && aberto !== v.id;
  const retomar = pos[v.id] ?? 0;
  const src = ex?.tipo === 'iframe' ? comApi(ex.src, tocar) : '';
  const quadro = useRef<HTMLIFrameElement>(null);

  const irPara = (k: number, sozinho = false) => {
    if (k < 0 || k >= videos.length) return;
    setTocar(sozinho);
    if (sozinho) setAberto(videos[k].id); // sem parar na foto de capa
    setI(k);
  };
  // Terminou: passa para o próximo vídeo; no último, avisa o curso (quiz ou conclusão)
  const terminou = () => { if (i < videos.length - 1) irPara(i + 1, true); else onFim(); };
  const aoTerminar = useRef(terminou);
  useEffect(() => { aoTerminar.current = terminou; });
  const fimAvisado = useRef<string | null>(null);

  // Abriu o vídeo: o curso conta como começado (vídeos do YouTube e outros sites não informam o tempo assistido)
  useEffect(() => {
    if (!abertos.current.has(v.id)) { abertos.current.add(v.id); void salvarPosicao({ videoId: v.id, segundos: 0 }); }
  }, [v.id]);

  // YouTube e Vimeo avisam por mensagem quando o vídeo termina
  useEffect(() => {
    if (!src) return;
    const ouvir = (e: MessageEvent) => {
      if (!quadro.current || e.source !== quadro.current.contentWindow) return;
      let d: unknown = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      const m = (d ?? {}) as { event?: string; info?: unknown };
      const info = m.info as { playerState?: number } | number | undefined;
      const acabou = (m.event === 'onStateChange' && info === 0)
        || (m.event === 'infoDelivery' && typeof info === 'object' && info?.playerState === 0)
        || m.event === 'finish' || m.event === 'ended';
      if (acabou && fimAvisado.current !== src) { fimAvisado.current = src; aoTerminar.current(); }
    };
    window.addEventListener('message', ouvir);
    return () => window.removeEventListener('message', ouvir);
  }, [src]);
  const conectar = () => {
    const w = quadro.current?.contentWindow;
    if (!w) return;
    if (/youtube/.test(src)) w.postMessage(JSON.stringify({ event: 'listening', id: v.id, channel: 'widget' }), '*');
    if (/vimeo/.test(src)) for (const ev of ['finish', 'ended']) w.postMessage(JSON.stringify({ method: 'addEventListener', value: ev }), '*');
  };

  const guardar = (el: HTMLVideoElement, agora = false) => {
    const s = Math.floor(el.duration && el.currentTime >= el.duration - 5 ? 0 : el.currentTime); // terminou: a próxima vez começa do início
    if (!agora && Date.now() - salvoEm.current < 10000) return;
    if (s === pos[v.id]) return;
    salvoEm.current = Date.now(); setPos((p) => ({ ...p, [v.id]: s }));
    void salvarPosicao({ videoId: v.id, segundos: s });
  };
  return (
    <div className="in-vbox">
      <div className="in-vmain">
        <div className="in-player">
          {capaAntes && (
            <button type="button" className="in-player-capa" onClick={() => setAberto(v.id)} aria-label={`Assistir: ${v.titulo}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage */}
              <img src={v.capa!} alt="" /><span className="icon">play_circle</span>
            </button>
          )}
          {ex?.tipo === 'iframe' && !capaAntes && <iframe ref={quadro} key={src} src={src} title={v.titulo} onLoad={conectar} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
          {ex?.tipo === 'video' && (
            <video key={ex.src} src={ex.src} poster={v.capa ?? undefined} controls playsInline preload="metadata" autoPlay={tocar}
              onLoadedMetadata={(e) => { const el = e.currentTarget; if (retomar > 5 && retomar < el.duration - 5) el.currentTime = retomar; }}
              onTimeUpdate={(e) => guardar(e.currentTarget)} onPause={(e) => guardar(e.currentTarget, true)}
              onEnded={(e) => { guardar(e.currentTarget, true); terminou(); }} />
          )}
          {(ex?.tipo === 'link' || !ex) && (
            <div className={`in-player-link${v.capa ? ' com-capa' : ''}`} style={v.capa ? { backgroundImage: `url("${v.capa}")` } : undefined}><span className="icon">play_circle</span><b>{v.titulo}</b>
              {ex?.tipo === 'link' && <a className="btn btn-l btn-outlined" href={ex.href} target="_blank" rel="noopener noreferrer"><span className="icon">open_in_new</span>Abrir vídeo</a>}
            </div>
          )}
        </div>
        {ex?.tipo === 'video' && (posicoes[v.id] ?? 0) > 5 && <p className="in-retomar"><span className="icon s16">history</span>Continua de onde você parou, em {tempo(posicoes[v.id])}</p>}
        {videos.length > 1 && (
          <div className="in-vnav">
            <button type="button" className="btn btn-m btn-outlined" disabled={i === 0} onClick={() => irPara(i - 1)} aria-label="Vídeo anterior"><span className="icon">chevron_left</span>Anterior</button>
            <span>Vídeo {i + 1} de {videos.length}<small>Ao terminar, o próximo começa sozinho</small></span>
            <button type="button" className="btn btn-m btn-outlined" disabled={i === videos.length - 1} onClick={() => irPara(i + 1)} aria-label="Próximo vídeo">Próximo<span className="icon">chevron_right</span></button>
          </div>
        )}
      </div>
      {videos.length > 1 && (
        <div className="in-vlist">
          {videos.map((x, k) => (
            <button key={x.id} type="button" className="in-vitem" aria-current={k === i} onClick={() => irPara(k)}>
              {x.capa
                // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage
                ? <span className="in-vthumb"><img src={x.capa} alt="" loading="lazy" /><span className="n">{k + 1}</span></span>
                : <span className="n">{k + 1}</span>}
              <span><b>{x.titulo}</b>{x.duracao && <small>{x.duracao}</small>}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Curso sem quiz: concluir (ou já concluído, com o botão de seguir) */
function Conclusao({ curso, nome, concluindo, erro, onConcluir, onConteudo }: { curso: CursoAlunoDados; nome: string; concluindo: boolean; erro: string; onConcluir: () => void; onConteudo: () => void }) {
  if (curso.progresso) {
    return (
      <section className="mod">
        <div className="in-res ok">
          <span className="icon in-res-i">task_alt</span>
          <div><b>Curso concluído!</b><span>{curso.seguir ? `Próximo curso: ${curso.seguir.titulo}.` : curso.ultimo ? 'Você concluiu todos os cursos da trilha.' : 'Você chegou ao fim da trilha.'}</span></div>
          {!curso.ultimo && <Seguir curso={curso} />}
        </div>
        {curso.ultimo && <Formatura curso={curso} nome={nome} />}
      </section>
    );
  }
  return (
    <section className="mod">
      <h2 className="in-h2">Conclusão</h2>
      <p className="in-lead">Este curso não tem quiz. Assista ao conteúdo e conclua: ele passa a contar na sua trilha.</p>
      <div className="in-acts">
        <button type="button" className="btn btn-l btn-outlined" onClick={onConteudo}>Ver o conteúdo</button>
        <button type="button" className="btn btn-l btn-filled" disabled={concluindo} onClick={onConcluir}><span className="icon">check_circle</span>{concluindo ? 'Concluindo…' : 'Concluir curso'}</button>
      </div>
      {erro && <p className="err" role="alert">{erro}</p>}
    </section>
  );
}

/** Formatura ao concluir o último curso: parabéns e o certificado para abrir ou baixar */
function Formatura({ curso, nome }: { curso: CursoAlunoDados; nome: string }) {
  const id = curso.trilha.id;
  return (
    <div className="in-forma" role="status">
      <span className="in-forma-i" aria-hidden="true"><span className="icon">school</span></span>
      <div className="in-forma-t">
        <span className="in-eyebrow">Formatura</span>
        <b>Parabéns, {nome}! Você concluiu a trilha {curso.trilha.titulo}.</b>
        <span>Seu certificado de conclusão está pronto.</span>
      </div>
      <div className="in-acts">
        <a className="btn btn-l btn-filled" href={`/interno/certificado/${id}?ver=1`} target="_blank" rel="noopener noreferrer"><span className="icon">open_in_new</span>Abrir certificado</a>
        <a className="btn btn-l btn-outlined" href={`/interno/certificado/${id}`}><span className="icon">download</span>Baixar certificado</a>
        <Link className="btn btn-l btn-outlined" href={`/interno/formatura/${id}`}><span className="icon">celebration</span>Ver minha formatura</Link>
      </div>
    </div>
  );
}

/** Botão de seguir: próximo curso que falta ou, se este fechou a trilha, a formatura */
function Seguir({ curso }: { curso: CursoAlunoDados }) {
  if (curso.seguir) return <Link className="btn btn-l btn-filled" href={`/interno/cursos/${curso.seguir.id}`}>Seguir para o próximo curso<span className="icon">arrow_forward</span></Link>;
  if (curso.ultimo) return <Link className="btn btn-l btn-filled" href={`/interno/formatura/${curso.trilha.id}`}><span className="icon">school</span>Ver minha formatura</Link>;
  return null;
}

/** Embaralha as alternativas só na tela; a resposta enviada é a posição original. */
const embaralhar = (n: number) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function Quiz({ curso, nome }: { curso: CursoAlunoDados; nome: string }) {
  const qs = curso.perguntas;
  const [ordem, setOrdem] = useState(() => qs.map((q) => embaralhar(q.alternativas.length)));
  const [i, setI] = useState(0);
  const [resp, setResp] = useState<Record<string, number>>({});
  const [res, setRes] = useState<ResultadoQuiz | null>(null);
  const [pend, start] = useTransition();
  if (!qs.length) return <section className="mod"><p className="in-vazio">Este curso ainda não tem perguntas.</p></section>;

  const respondidas = qs.filter((q) => resp[q.id] != null).length;
  const enviar = () => start(async () => { try { setRes(await enviarQuiz({ cursoId: curso.id, respostas: resp })); } catch { setRes({ ok: false, erro: 'Não foi possível enviar. Confira sua conexão e tente de novo.' }); } });
  const refazer = () => { setRes(null); setResp({}); setI(0); setOrdem(qs.map((q) => embaralhar(q.alternativas.length))); };

  if (res?.ok) {
    return (
      <section className="mod">
        <div className={`in-res ${res.aprovada ? 'ok' : 'nao'}`}>
          <span className="in-nota">{res.acertos}/{res.total}</span>
          <div><b>{res.aprovada ? 'Curso concluído!' : 'Ainda não foi dessa vez.'}</b>
            <span>{!res.aprovada ? `Você precisa de ${res.minimo} acertos. Revise o conteúdo e tente de novo.`
              : curso.seguir ? `Próximo curso: ${curso.seguir.titulo}.`
                : curso.ultimo ? 'Você concluiu todos os cursos da trilha. Sua formatura está pronta!' : 'Você chegou ao fim da trilha.'}</span></div>
          {res.aprovada ? !curso.ultimo && <Seguir curso={curso} /> : <button type="button" className="btn btn-l btn-filled" onClick={refazer}>Refazer quiz</button>}
        </div>
        {res.aprovada && curso.ultimo && <Formatura curso={curso} nome={nome} />}
        <h3 className="in-h3">Suas respostas</h3>
        <ol className="in-rev">
          {res.revisao.map((r, k) => {
            const certa = r.marcada === r.correta;
            return (
              <li key={k}><b>{r.enunciado}</b>
                <span className={certa ? 'y' : 'n'}>{certa ? 'Correta' : 'Incorreta'}</span>
                {certa ? ` · ${r.alternativas[r.correta]}` : ` · você marcou “${r.marcada != null ? r.alternativas[r.marcada] : 'nada'}”. Resposta: ${r.alternativas[r.correta]}`}
              </li>
            );
          })}
        </ol>
        {res.aprovada && <div className="in-acts"><button type="button" className="btn btn-m btn-outlined" onClick={refazer}>Refazer quiz</button></div>}
      </section>
    );
  }

  const q = qs[i];
  return (
    <section className="mod">
      {curso.progresso && <div className="notice in-ok"><span className="icon">check_circle</span><div>Você já concluiu este curso com {curso.progresso.acertos}/{curso.progresso.total}. Pode refazer para melhorar a nota.</div></div>}
      {curso.progresso && curso.ultimo && <Formatura curso={curso} nome={nome} />}
      <div className="in-qtop">
        <span className="in-eyebrow">Pergunta {i + 1} de {qs.length} · mínimo {curso.aprovacao} acertos</span>
        <span className="in-dots" aria-hidden="true">{qs.map((x, k) => <i key={x.id} className={k === i ? 'c' : resp[x.id] != null ? 'a' : ''} />)}</span>
      </div>
      <h2 className="in-q" id="q-t">{q.enunciado}</h2>
      <div className="in-opts" role="radiogroup" aria-labelledby="q-t">
        {ordem[i].map((oi) => (
          <label key={oi} className={`in-opt${resp[q.id] === oi ? ' sel' : ''}`}>
            <input type="radio" name={`q-${q.id}`} checked={resp[q.id] === oi} onChange={() => setResp({ ...resp, [q.id]: oi })} />
            <span>{q.alternativas[oi]}</span>
          </label>
        ))}
      </div>
      {res && !res.ok && <p className="err" role="alert">{res.erro}</p>}
      <div className="in-qnav">
        <button type="button" className="btn btn-l btn-outlined" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button>
        {i < qs.length - 1
          ? <button type="button" className="btn btn-l btn-filled" disabled={resp[q.id] == null} onClick={() => setI(i + 1)}>Próxima</button>
          : <button type="button" className="btn btn-l btn-filled" disabled={respondidas < qs.length || pend} onClick={enviar}>{pend ? 'Enviando…' : `Enviar respostas (${respondidas}/${qs.length})`}</button>}
      </div>
    </section>
  );
}
