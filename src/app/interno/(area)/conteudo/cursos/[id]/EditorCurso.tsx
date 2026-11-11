'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Upload } from 'tus-js-client';
import { Dropdown, type Opcao } from '@/components/Dropdown';
import { Modal } from '@/components/equipe/Modal';
import { toast } from '@/components/equipe/Toast';
import '@/components/equipe/equipe-comp.css';
import { exibicaoDeVideo } from '@/lib/aprendizagem';
import type { EnvioAssinado } from '@/lib/armazenamento';
import { excluirCurso, prepararEnvioVideo, salvarCurso, type CursoEdicao } from '../../acoes';

/* Editor de um curso: dados, conteúdo, vídeos (por link), materiais e perguntas. Salva tudo de uma vez. */

type Video = CursoEdicao['videos'][number];
type Material = CursoEdicao['materiais'][number];
type Pergunta = CursoEdicao['perguntas'][number];

const mover = <T,>(l: T[], i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= l.length) return l; const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n; };
const tirar = <T,>(l: T[], i: number) => l.filter((_, k) => k !== i);
const tamanhoLegivel = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB` : `${mb} MB`);
const trocar = <T,>(l: T[], i: number, v: T) => l.map((x, k) => (k === i ? v : x));

function Ordem({ i, n, rotulo, onMover, onTirar }: { i: number; n: number; rotulo: string; onMover: (d: -1 | 1) => void; onTirar: () => void }) {
  return (
    <div className="ed-tools">
      <button type="button" className="btn btn-m btn-outlined btn-icon" disabled={i === 0} onClick={() => onMover(-1)} aria-label={`Subir ${rotulo}`} title="Subir"><span className="icon">arrow_upward</span></button>
      <button type="button" className="btn btn-m btn-outlined btn-icon" disabled={i === n - 1} onClick={() => onMover(1)} aria-label={`Descer ${rotulo}`} title="Descer"><span className="icon">arrow_downward</span></button>
      <button type="button" className="btn btn-m btn-outlined btn-icon" onClick={onTirar} aria-label={`Remover ${rotulo}`} title="Remover"><span className="icon">delete</span></button>
    </div>
  );
}

export function EditorCurso({ inicial, etapas, trilhaId, tentativas, limiteMb }: { inicial: CursoEdicao; etapas: Opcao[]; trilhaId: string; tentativas: number; limiteMb: number }) {
  const router = useRouter();
  const [c, setC] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [aprender, setAprender] = useState(inicial.aprender.join('\n'));
  const [erro, setErro] = useState('');
  const [excluir, setExcluir] = useState(false);
  const [pend, start] = useTransition();
  const atual = { ...c, aprender: aprender.split('\n').map((s) => s.trim()).filter(Boolean) };
  const mudou = JSON.stringify(atual) !== JSON.stringify(salvo);
  const set = <K extends keyof CursoEdicao>(k: K, v: CursoEdicao[K]) => setC((x) => ({ ...x, [k]: v }));

  // Aviso ao sair com alterações não salvas
  useEffect(() => {
    if (!mudou) return;
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [mudou]);

  const salvar = () => start(async () => {
    setErro('');
    try {
      const r = await salvarCurso(atual);
      if (!r.ok) { setErro(r.erro); toast(r.erro, 'error'); return; }
      setSalvo(atual);
      toast(r.msg);
      router.refresh();
    } catch { setErro('Não foi possível salvar. Tente de novo.'); }
  });

  return (
    <>
      <div className="rp-head">
        <div><h1>{salvo.titulo}</h1><p>{salvo.publicado ? 'Publicado: os colaboradores já veem este curso.' : 'Oculto: só quem edita vê este curso.'}</p></div>
        <div className="rp-actions"><Link className="btn btn-l btn-outlined" href={`/interno/cursos/${c.id}`}><span className="icon">visibility</span>Ver como colaborador</Link></div>
      </div>

      <section className="mod ed-bloco">
        <div className="mod-h"><div><h2>Dados do curso</h2></div></div>
        <div className="ed-grid">
          <div className="fld"><label htmlFor="c-t">Título</label><input id="c-t" maxLength={120} value={c.titulo} onChange={(e) => set('titulo', e.target.value)} /></div>
          <div className="fld"><label htmlFor="c-e">Etapa</label><Dropdown id="c-e" value={c.etapaId} opcoes={etapas} onChange={(v) => set('etapaId', v)} /></div>
          <div className="fld"><label htmlFor="c-a">Área</label><input id="c-a" maxLength={60} placeholder="Ex.: Setor, Produto" value={c.area} onChange={(e) => set('area', e.target.value)} /></div>
          <div className="fld"><label htmlFor="c-ct">Com quem falar</label><input id="c-ct" maxLength={200} placeholder="Ex.: Gerente Financeiro · financeiro@takeat.app" value={c.contato} onChange={(e) => set('contato', e.target.value)} /></div>
          <div className="fld ed-full"><label htmlFor="c-r">Resumo</label><input id="c-r" maxLength={300} value={c.resumo} onChange={(e) => set('resumo', e.target.value)} /></div>
          <div className="fld ed-full"><label htmlFor="c-ap">O que você vai aprender</label><textarea id="c-ap" value={aprender} onChange={(e) => setAprender(e.target.value)} /><div className="info">Um item por linha, até 10.</div></div>
        </div>
      </section>

      <section className="mod ed-bloco">
        <div className="mod-h"><div><h2>Conteúdo em texto</h2><p>Separe os parágrafos com uma linha em branco.</p></div></div>
        <div className="fld"><label htmlFor="c-tx" className="sr-only">Texto do curso</label><textarea id="c-tx" className="ed-texto" value={c.texto} onChange={(e) => set('texto', e.target.value)} /></div>
      </section>

      <section className="mod ed-bloco">
        <div className="mod-h"><div><h2>Vídeos ({c.videos.length})</h2><p>Envie o arquivo do vídeo. Ele fica guardado de forma privada e só toca para quem está logado na plataforma.</p></div></div>
        {c.videos.map((v, i) => (
          <VideoEditor key={i} cursoId={c.id} limiteMb={limiteMb} v={v} i={i} n={c.videos.length} onChange={(x) => set('videos', trocar(c.videos, i, x))} onMover={(d) => set('videos', mover(c.videos, i, d))} onTirar={() => set('videos', tirar(c.videos, i))} />
        ))}
        <div><button type="button" className="btn btn-m btn-outlined" onClick={() => set('videos', [...c.videos, { titulo: '', duracao: '', url: '', arquivo: '', nomeArquivo: '' } as Video])}><span className="icon">add</span>Adicionar vídeo</button></div>
      </section>

      <section className="mod ed-bloco">
        <div className="mod-h"><div><h2>Materiais ({c.materiais.length})</h2><p>Links para PDFs, apresentações ou documentos (por exemplo, no Google Drive).</p></div></div>
        {c.materiais.map((m, i) => (
          <div className="ed-item" key={i}>
            <div className="ed-grid">
              <div className="fld"><label htmlFor={`m-t-${i}`}>Título</label><input id={`m-t-${i}`} maxLength={120} value={m.titulo} onChange={(e) => set('materiais', trocar(c.materiais, i, { ...m, titulo: e.target.value }))} /></div>
              <div className="fld"><label htmlFor={`m-u-${i}`}>Link</label><input id={`m-u-${i}`} type="url" placeholder="https://" value={m.url} onChange={(e) => set('materiais', trocar(c.materiais, i, { ...m, url: e.target.value }))} /></div>
              <div className="fld ed-full"><label htmlFor={`m-d-${i}`}>Descrição (opcional)</label><input id={`m-d-${i}`} maxLength={200} value={m.descricao} onChange={(e) => set('materiais', trocar(c.materiais, i, { ...m, descricao: e.target.value }))} /></div>
            </div>
            <Ordem i={i} n={c.materiais.length} rotulo={`material ${i + 1}`} onMover={(d) => set('materiais', mover(c.materiais, i, d))} onTirar={() => set('materiais', tirar(c.materiais, i))} />
          </div>
        ))}
        <div><button type="button" className="btn btn-m btn-outlined" onClick={() => set('materiais', [...c.materiais, { titulo: '', descricao: '', url: '' } as Material])}><span className="icon">add</span>Adicionar material</button></div>
      </section>

      <section className="mod ed-bloco">
        <div className="mod-h"><div><h2>Quiz ({c.perguntas.length} {c.perguntas.length === 1 ? 'pergunta' : 'perguntas'})</h2><p>Marque a alternativa correta de cada pergunta. As alternativas aparecem embaralhadas para o colaborador.</p></div></div>
        <div className="fld ed-min"><label htmlFor="c-min">Acertos mínimos para concluir</label><input id="c-min" type="number" min={1} max={50} value={c.aprovacao} onChange={(e) => set('aprovacao', Math.max(1, Number(e.target.value) || 1))} /><div className="info">De {c.perguntas.length} perguntas.</div></div>
        {c.perguntas.map((q, i) => (
          <PerguntaEditor key={i} q={q} i={i} n={c.perguntas.length} onChange={(x) => set('perguntas', trocar(c.perguntas, i, x))} onMover={(d) => set('perguntas', mover(c.perguntas, i, d))} onTirar={() => set('perguntas', tirar(c.perguntas, i))} />
        ))}
        <div><button type="button" className="btn btn-m btn-outlined" onClick={() => set('perguntas', [...c.perguntas, { enunciado: '', alternativas: ['', '', ''], correta: 0 } as Pergunta])}><span className="icon">add</span>Adicionar pergunta</button></div>
      </section>

      <div className="ed-barra">
        <label className="ed-check"><input type="checkbox" checked={c.publicado} onChange={(e) => set('publicado', e.target.checked)} /><span><b>Publicado</b><small>Visível para os colaboradores (se a trilha também estiver publicada).</small></span></label>
        {erro && <p className="err" role="alert">{erro}</p>}
        <div className="ed-acts">
          <button type="button" className="btn btn-l btn-outlined" disabled={pend} onClick={() => setExcluir(true)}><span className="icon">delete</span>Excluir curso</button>
          <span className="ed-status" aria-live="polite">{mudou ? 'Alterações não salvas' : 'Tudo salvo'}</span>
          <button type="button" className="btn btn-l btn-filled" disabled={pend || !mudou} onClick={salvar}>{pend ? 'Salvando…' : 'Salvar curso'}</button>
        </div>
      </div>

      {excluir && (
        <Modal titulo="Excluir curso?" onFechar={() => setExcluir(false)} foco=".md-f .btn-outlined" rodape={<>
          <button type="button" className="btn btn-l btn-outlined" onClick={() => setExcluir(false)}>Cancelar</button>
          <button type="button" className="btn btn-l btn-danger" disabled={pend || tentativas > 0} onClick={() => start(async () => {
            const r = await excluirCurso(c.id);
            if (!r.ok) { toast(r.erro, 'error'); return; }
            toast(r.msg); router.push(`/interno/conteudo/trilhas/${trilhaId}`);
          })}>Excluir</button>
        </>}>
          <p>{tentativas > 0 ? `${tentativas} ${tentativas === 1 ? 'pessoa já fez' : 'tentativas já foram feitas n'}o quiz deste curso. Para não perder o histórico, desmarque "Publicado" em vez de excluir.` : 'O curso, os vídeos, os materiais e as perguntas serão apagados.'}</p>
        </Modal>
      )}
    </>
  );
}

/** Envia o arquivo direto do navegador para o Storage em partes de 6 MB (TUS).
    Se a conexão oscilar, cada parte é reenviada sozinha, sem recomeçar o vídeo inteiro. */
function enviarArquivo(e: EnvioAssinado, arquivo: File, progresso: (pct: number) => void) {
  return new Promise<void>((ok, falha) => {
    const envio = new Upload(arquivo, {
      endpoint: e.endpoint,
      headers: { 'x-signature': e.token, 'x-upsert': 'false' },
      metadata: { bucketName: e.bucket, objectName: e.caminho, contentType: arquivo.type, cacheControl: '3600' },
      chunkSize: 6 * 1024 * 1024, // exigido pelo Supabase
      uploadDataDuringCreation: true,
      storeFingerprintForResuming: false, // cada envio tem um caminho novo; não retoma envios antigos
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onProgress: (enviado, total) => progresso(Math.min(99, Math.round((enviado / total) * 100))),
      onSuccess: () => { progresso(100); ok(); },
      onError: falha,
    });
    envio.start();
  });
}

function VideoEditor({ cursoId, limiteMb, v, i, n, onChange, onMover, onTirar }: { cursoId: string; limiteMb: number; v: Video; i: number; n: number; onChange: (v: Video) => void; onMover: (d: -1 | 1) => void; onTirar: () => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const [link, setLink] = useState(!v.arquivo && !!v.url);
  const ex = v.url ? exibicaoDeVideo(v.url) : null;
  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro('');
    if (arquivo.size > limiteMb * 1024 * 1024) { setErro(`O vídeo tem ${Math.ceil(arquivo.size / 1024 / 1024)} MB. O limite é de ${tamanhoLegivel(limiteMb)} por arquivo.`); return; }
    setPct(0);
    try {
      const r = await prepararEnvioVideo({ cursoId, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size });
      if (!r.ok) { setErro(r.erro); setPct(null); return; }
      await enviarArquivo(r.envio, arquivo, setPct);
      onChange({ ...v, titulo: v.titulo || arquivo.name.replace(/\.[^.]+$/, ''), arquivo: r.envio.caminho, nomeArquivo: arquivo.name, url: '' });
      toast('Vídeo enviado. Clique em "Salvar curso" para guardar.', 'upload');
    } catch {
      setErro('O envio falhou. Confira sua conexão e tente de novo.');
    }
    setPct(null);
  };
  return (
    <div className="ed-item">
      <div className="ed-grid">
        <div className="fld"><label htmlFor={`v-t-${i}`}>Título do vídeo {i + 1}</label><input id={`v-t-${i}`} maxLength={120} value={v.titulo} onChange={(e) => onChange({ ...v, titulo: e.target.value })} /></div>
        <div className="fld"><label htmlFor={`v-d-${i}`}>Duração (opcional)</label><input id={`v-d-${i}`} maxLength={20} placeholder="Ex.: 3min18" value={v.duracao} onChange={(e) => onChange({ ...v, duracao: e.target.value })} /></div>
        <div className="fld ed-full">
          <span className="ed-rot">Arquivo do vídeo</span>
          {pct !== null ? (
            <div className="ed-envio" role="status"><span>Enviando… {pct}%</span><div className="in-barra"><i style={{ width: `${pct}%` }} /></div></div>
          ) : v.arquivo ? (
            <div className="ed-arq"><span className="icon">movie</span><span className="ed-arq-n">{v.nomeArquivo || 'Vídeo enviado'}</span>
              <label className="btn btn-m btn-outlined">Trocar<input type="file" accept={TIPOS} hidden onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = ''; }} /></label>
              <button type="button" className="btn btn-m btn-outlined" onClick={() => onChange({ ...v, arquivo: '', nomeArquivo: '' })}>Remover arquivo</button>
            </div>
          ) : (
            <div className="ed-arq">
              <label className="btn btn-m btn-outlined"><span className="icon">upload</span>Enviar vídeo<input type="file" accept={TIPOS} hidden onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = ''; }} /></label>
              <span className="ed-arq-n">MP4, WebM ou MOV, até {tamanhoLegivel(limiteMb)}.</span>
              {!link && <button type="button" className="linkbtn" onClick={() => setLink(true)}>Usar um link</button>}
            </div>
          )}
          {erro && <div className="err" role="alert">{erro}</div>}
          {!v.arquivo && !erro && pct === null && !v.url && !link && <div className="info">Sem arquivo: o vídeo ainda não aparece para o colaborador.</div>}
        </div>
        {!v.arquivo && link && (
          <div className="fld ed-full">
            <label htmlFor={`v-u-${i}`}>Ou link do vídeo</label>
            <input id={`v-u-${i}`} type="url" placeholder="https://" value={v.url} onChange={(e) => onChange({ ...v, url: e.target.value })} aria-describedby={`v-i-${i}`} />
            <div className="info" id={`v-i-${i}`}>
              {!v.url ? 'YouTube, Vimeo ou Google Drive.'
                : !ex ? 'Link inválido: cole o endereço completo, começando com https://'
                  : ex.tipo === 'iframe' ? 'O vídeo vai tocar dentro da plataforma.'
                    : ex.tipo === 'video' ? 'Arquivo de vídeo: toca no player do navegador.'
                      : 'Este site não toca dentro da plataforma: o colaborador verá um botão para abrir o vídeo.'}
            </div>
          </div>
        )}
      </div>
      <Ordem i={i} n={n} rotulo={`vídeo ${i + 1}`} onMover={onMover} onTirar={onTirar} />
    </div>
  );
}
const TIPOS = 'video/mp4,video/webm,video/quicktime,video/x-m4v';

function PerguntaEditor({ q, i, n, onChange, onMover, onTirar }: { q: Pergunta; i: number; n: number; onChange: (q: Pergunta) => void; onMover: (d: -1 | 1) => void; onTirar: () => void }) {
  const alt = (k: number, txt: string) => onChange({ ...q, alternativas: trocar(q.alternativas, k, txt) });
  const tirarAlt = (k: number) => onChange({ ...q, alternativas: tirar(q.alternativas, k), correta: q.correta === k ? 0 : q.correta > k ? q.correta - 1 : q.correta });
  return (
    <div className="ed-item ed-perg">
      <div className="ed-pb">
        <div className="fld"><label htmlFor={`q-${i}`}>Pergunta {i + 1}</label><input id={`q-${i}`} maxLength={400} value={q.enunciado} onChange={(e) => onChange({ ...q, enunciado: e.target.value })} /></div>
        <div className="ed-alts" role="radiogroup" aria-label={`Alternativa correta da pergunta ${i + 1}`}>
          {q.alternativas.map((a, k) => (
            <div key={k} className={`ed-alt${q.correta === k ? ' ok' : ''}`}>
              <input type="radio" name={`ok-${i}`} checked={q.correta === k} onChange={() => onChange({ ...q, correta: k })} aria-label={`Alternativa ${k + 1} é a correta`} />
              <input className="ed-alt-t" maxLength={200} value={a} placeholder={`Alternativa ${k + 1}`} onChange={(e) => alt(k, e.target.value)} aria-label={`Texto da alternativa ${k + 1}`} />
              {q.correta === k && <span className="chip chip-teal">Correta</span>}
              <button type="button" className="btn btn-m btn-outlined btn-icon" disabled={q.alternativas.length <= 2} onClick={() => tirarAlt(k)} aria-label={`Remover alternativa ${k + 1}`} title="Remover alternativa"><span className="icon">close</span></button>
            </div>
          ))}
          {q.alternativas.length < 6 && <div><button type="button" className="linkbtn" onClick={() => onChange({ ...q, alternativas: [...q.alternativas, ''] })}>+ Alternativa</button></div>}
        </div>
      </div>
      <Ordem i={i} n={n} rotulo={`pergunta ${i + 1}`} onMover={onMover} onTirar={onTirar} />
    </div>
  );
}
