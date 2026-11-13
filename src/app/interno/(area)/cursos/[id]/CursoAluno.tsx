'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { exibicaoDeVideo } from '@/lib/aprendizagem';
import type { CursoAlunoDados } from '@/lib/trilhas';
import { Capa } from '../../pecas';
import { enviarQuiz, type ResultadoQuiz } from './acoes';

/* Curso para quem aprende: visão geral, conteúdo (vídeos e texto), materiais e quiz final. */

type Secao = 'visao' | 'conteudo' | 'materiais' | 'quiz';

export function CursoAluno({ curso, editar }: { curso: CursoAlunoDados; editar: string | null }) {
  const [secao, setSecao] = useState<Secao>('visao');
  const SECOES: [Secao, string][] = [['visao', 'Visão geral'], ['conteudo', 'Conteúdo'], ['materiais', `Materiais${curso.materiais.length ? ` (${curso.materiais.length})` : ''}`], ['quiz', 'Quiz final']];
  const ir = (s: Secao) => { setSecao(s); window.scrollTo({ top: 0 }); };
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
            {curso.progresso && <span className="chip chip-teal">Concluído com {curso.progresso.acertos}/{curso.progresso.total}</span>}
            {!curso.publicado && <span className="chip chip-yellow">Não publicado</span>}
          </div>
          <h1>{curso.titulo}</h1>
          {editar && <Link className="btn btn-m btn-outlined in-editar" href={editar}><span className="icon">edit</span>Editar curso</Link>}
        </div>

        {secao === 'visao' && (
          <section className="mod">
            <h2 className="in-h2">Sobre este curso</h2>
            <p className="in-lead">{curso.resumo}</p>
            {curso.aprender.length > 0 && <ul className="in-learn">{curso.aprender.map((a) => <li key={a}><span className="icon s16">check</span>{a}</li>)}</ul>}
            {curso.contato && <p className="in-contato"><b>Com quem falar:</b> {curso.contato}</p>}
            <div className="in-acts"><button type="button" className="btn btn-l btn-filled" onClick={() => ir('conteudo')}>{curso.progresso ? 'Rever conteúdo' : 'Começar curso'}</button></div>
          </section>
        )}

        {secao === 'conteudo' && (
          <section className="mod">
            <h2 className="in-h2">Conteúdo</h2>
            {curso.videos.length > 0 && <Videos videos={curso.videos} />}
            <div className="in-texto">{curso.texto.split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>
            {curso.contato && <p className="in-contato"><b>Com quem falar:</b> {curso.contato}</p>}
            <div className="in-acts">
              {curso.materiais.length > 0 && <button type="button" className="btn btn-l btn-outlined" onClick={() => ir('materiais')}>Ver materiais</button>}
              <button type="button" className="btn btn-l btn-filled" onClick={() => ir('quiz')}>Fazer o quiz</button>
            </div>
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
            <div className="in-acts"><button type="button" className="btn btn-l btn-filled" onClick={() => ir('quiz')}>Fazer o quiz</button></div>
          </section>
        )}

        {secao === 'quiz' && <Quiz key={curso.id} curso={curso} />}
      </div>
    </div>
  );
}

function Videos({ videos }: { videos: CursoAlunoDados['videos'] }) {
  const [i, setI] = useState(0);
  // Vídeo incorporado (YouTube, Vimeo…) com foto de capa: mostra a foto até a pessoa clicar em assistir
  const [aberto, setAberto] = useState<string | null>(null);
  const v = videos[Math.min(i, videos.length - 1)];
  const ex = exibicaoDeVideo(v.url);
  const capaAntes = ex?.tipo === 'iframe' && v.capa && aberto !== v.id;
  return (
    <div className="in-vbox">
      <div className="in-player">
        {capaAntes && (
          <button type="button" className="in-player-capa" onClick={() => setAberto(v.id)} aria-label={`Assistir: ${v.titulo}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage */}
            <img src={v.capa!} alt="" /><span className="icon">play_circle</span>
          </button>
        )}
        {ex?.tipo === 'iframe' && !capaAntes && <iframe key={ex.src} src={ex.src} title={v.titulo} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
        {ex?.tipo === 'video' && <video key={ex.src} src={ex.src} poster={v.capa ?? undefined} controls playsInline preload="metadata" />}
        {(ex?.tipo === 'link' || !ex) && (
          <div className={`in-player-link${v.capa ? ' com-capa' : ''}`} style={v.capa ? { backgroundImage: `url("${v.capa}")` } : undefined}><span className="icon">play_circle</span><b>{v.titulo}</b>
            {ex?.tipo === 'link' && <a className="btn btn-l btn-outlined" href={ex.href} target="_blank" rel="noopener noreferrer"><span className="icon">open_in_new</span>Abrir vídeo</a>}
          </div>
        )}
      </div>
      {videos.length > 1 && (
        <div className="in-vlist">
          {videos.map((x, k) => (
            <button key={x.id} type="button" className="in-vitem" aria-current={k === i} onClick={() => setI(k)}>
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

/** Embaralha as alternativas só na tela; a resposta enviada é a posição original. */
const embaralhar = (n: number) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function Quiz({ curso }: { curso: CursoAlunoDados }) {
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
            <span>{res.aprovada ? (curso.proximo ? 'Siga para o próximo curso sugerido da trilha.' : 'Você chegou ao fim da trilha.') : `Você precisa de ${res.minimo} acertos. Revise o conteúdo e tente de novo.`}</span></div>
          {res.aprovada && curso.proximo
            ? <Link className="btn btn-l btn-filled" href={`/interno/cursos/${curso.proximo.id}`}>Próximo: {curso.proximo.titulo}</Link>
            : !res.aprovada && <button type="button" className="btn btn-l btn-filled" onClick={refazer}>Refazer quiz</button>}
        </div>
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
