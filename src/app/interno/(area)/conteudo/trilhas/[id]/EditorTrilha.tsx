'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Modal } from '@/components/equipe/Modal';
import { toast } from '@/components/equipe/Toast';
import '@/components/equipe/equipe-comp.css';
import { criarCurso, criarEtapa, excluirEtapa, excluirTrilha, moverCurso, moverEtapa, salvarEtapa, salvarTrilha, type Resultado } from '../../acoes';

type Curso = { id: string; titulo: string; publicado: boolean; perguntas: number; semVideo: number };
type Etapa = { id: string; nome: string; descricao: string; cursos: Curso[] };
type Trilha = { id: string; titulo: string; descricao: string; publico: string; publicada: boolean };

/** Roda uma ação e mostra o resultado no toast */
function useAcao() {
  const [pend, start] = useTransition();
  const rodar = (f: () => Promise<Resultado>, depois?: (r: Extract<Resultado, { ok: true }>) => void) =>
    start(async () => {
      try {
        const r = await f();
        if (r.ok) { if (r.msg !== 'Nada mudou.') toast(r.msg); depois?.(r); } else toast(r.erro, 'error');
      } catch { toast('Não foi possível concluir. Tente de novo.', 'error'); }
    });
  return { pend, rodar };
}

export function EditorTrilha({ trilha, etapas }: { trilha: Trilha; etapas: Etapa[] }) {
  const router = useRouter();
  const [t, setT] = useState(trilha);
  const [excluir, setExcluir] = useState(false);
  const { pend, rodar } = useAcao();
  const mudou = t.titulo !== trilha.titulo || t.descricao !== trilha.descricao || t.publico !== trilha.publico || t.publicada !== trilha.publicada;

  return (
    <>
      <div className="rp-head">
        <div><h1>{trilha.titulo}</h1><p>Monte as etapas e os cursos. A ordem abaixo é a ordem sugerida para o colaborador.</p></div>
        <div className="rp-actions"><Link className="btn btn-l btn-outlined" href={`/interno/trilhas/${trilha.id}`}><span className="icon">visibility</span>Ver como colaborador</Link></div>
      </div>

      <section className="mod ed-bloco">
        <div className="mod-h"><div><h2>Dados da trilha</h2></div></div>
        <div className="ed-grid">
          <div className="fld"><label htmlFor="t-t">Título</label><input id="t-t" maxLength={120} value={t.titulo} onChange={(e) => setT({ ...t, titulo: e.target.value })} /></div>
          <div className="fld"><label htmlFor="t-p">Público</label><input id="t-p" maxLength={80} placeholder="Ex.: Novos colaboradores" value={t.publico} onChange={(e) => setT({ ...t, publico: e.target.value })} /></div>
          <div className="fld ed-full"><label htmlFor="t-d">Descrição</label><textarea id="t-d" maxLength={600} value={t.descricao} onChange={(e) => setT({ ...t, descricao: e.target.value })} /></div>
        </div>
        <label className="ed-check"><input type="checkbox" checked={t.publicada} onChange={(e) => setT({ ...t, publicada: e.target.checked })} /><span><b>Publicada</b><small>Os colaboradores veem a trilha e os cursos publicados dela.</small></span></label>
        <div className="ed-acts">
          <button type="button" className="btn btn-l btn-outlined" disabled={pend} onClick={() => setExcluir(true)}><span className="icon">delete</span>Excluir trilha</button>
          <button type="button" className="btn btn-l btn-filled" disabled={pend || !mudou} onClick={() => rodar(() => salvarTrilha(t), () => router.refresh())}>Salvar trilha</button>
        </div>
      </section>

      {etapas.map((e, i) => (
        <EtapaEditor key={e.id} etapa={e} primeira={i === 0} ultima={i === etapas.length - 1} trilhaId={trilha.id} />
      ))}
      <button type="button" className="btn btn-l btn-outlined ed-nova" disabled={pend} onClick={() => rodar(() => criarEtapa(trilha.id))}><span className="icon">add</span>Nova etapa</button>

      {excluir && (
        <Modal titulo="Excluir trilha?" onFechar={() => setExcluir(false)} foco=".md-f .btn-outlined" rodape={<>
          <button type="button" className="btn btn-l btn-outlined" onClick={() => setExcluir(false)}>Cancelar</button>
          <button type="button" className="btn btn-l btn-danger" disabled={pend} onClick={() => rodar(() => excluirTrilha(trilha.id), () => router.push('/interno/conteudo'))}>Excluir</button>
        </>}>
          <p>A trilha, as etapas, os cursos e as perguntas serão apagados. Se alguém já fez quiz nela, a exclusão é bloqueada: despublique em vez de excluir.</p>
        </Modal>
      )}
    </>
  );
}

function EtapaEditor({ etapa, primeira, ultima, trilhaId }: { etapa: Etapa; primeira: boolean; ultima: boolean; trilhaId: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(etapa.nome);
  const [descricao, setDescricao] = useState(etapa.descricao);
  const { pend, rodar } = useAcao();
  const mudou = nome !== etapa.nome || descricao !== etapa.descricao;
  return (
    <section className="mod ed-bloco" aria-label={`Etapa ${etapa.nome}`}>
      <div className="ed-etapa-h">
        <div className="ed-grid">
          <div className="fld"><label htmlFor={`e-n-${etapa.id}`}>Nome da etapa</label><input id={`e-n-${etapa.id}`} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="fld"><label htmlFor={`e-d-${etapa.id}`}>Descrição (opcional)</label><input id={`e-d-${etapa.id}`} maxLength={200} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        </div>
        <div className="ed-tools">
          <button type="button" className="btn btn-m btn-outlined" disabled={pend || !mudou} onClick={() => rodar(() => salvarEtapa({ id: etapa.id, nome, descricao }))}>Salvar</button>
          <button type="button" className="btn btn-m btn-outlined btn-icon" disabled={pend || primeira} onClick={() => rodar(() => moverEtapa(etapa.id, -1))} aria-label="Subir etapa" title="Subir etapa"><span className="icon">arrow_upward</span></button>
          <button type="button" className="btn btn-m btn-outlined btn-icon" disabled={pend || ultima} onClick={() => rodar(() => moverEtapa(etapa.id, 1))} aria-label="Descer etapa" title="Descer etapa"><span className="icon">arrow_downward</span></button>
          <button type="button" className="btn btn-m btn-outlined btn-icon" disabled={pend || etapa.cursos.length > 0} onClick={() => rodar(() => excluirEtapa(etapa.id))} aria-label="Excluir etapa" title={etapa.cursos.length ? 'Só dá para excluir etapa sem cursos' : 'Excluir etapa'}><span className="icon">delete</span></button>
        </div>
      </div>
      {etapa.cursos.length ? (
        <ol className="ed-cursos">
          {etapa.cursos.map((c, k) => (
            <li key={c.id}>
              <span className="ed-n">{k + 1}</span>
              <div className="ed-c">
                <b>{c.titulo}</b>
                <span className="in-chips">
                  {c.publicado ? <span className="chip chip-teal">Publicado</span> : <span className="chip chip-yellow">Oculto</span>}
                  <span className="chip chip-neutral">{c.perguntas} perguntas</span>
                  {c.semVideo > 0 && <span className="chip chip-yellow">{c.semVideo} {c.semVideo === 1 ? 'vídeo sem link' : 'vídeos sem link'}</span>}
                </span>
              </div>
              <div className="ed-tools">
                <button type="button" className="btn btn-m btn-outlined btn-icon" disabled={pend || k === 0} onClick={() => rodar(() => moverCurso(c.id, -1))} aria-label={`Subir ${c.titulo}`} title="Subir"><span className="icon">arrow_upward</span></button>
                <button type="button" className="btn btn-m btn-outlined btn-icon" disabled={pend || k === etapa.cursos.length - 1} onClick={() => rodar(() => moverCurso(c.id, 1))} aria-label={`Descer ${c.titulo}`} title="Descer"><span className="icon">arrow_downward</span></button>
                <Link className="btn btn-m btn-outlined" href={`/interno/conteudo/cursos/${c.id}`}><span className="icon">edit</span>Editar</Link>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="in-vazio">Nenhum curso nesta etapa.</p>}
      <div><button type="button" className="btn btn-m btn-outlined" disabled={pend} onClick={() => rodar(() => criarCurso(etapa.id), (r) => router.push(`/interno/conteudo/cursos/${r.id}?trilha=${trilhaId}`))}><span className="icon">add</span>Novo curso</button></div>
    </section>
  );
}
