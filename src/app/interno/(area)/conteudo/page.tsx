import Link from 'next/link';
import { Toaster } from '@/components/equipe/Toast';
import { db } from '@/lib/db';
import { exigirEditorConteudo } from '@/lib/sessao';
import { NovaTrilha } from './NovaTrilha';
import '../interno.css';

export const metadata = { title: 'Conteúdo' };

export default async function Conteudo() {
  await exigirEditorConteudo();
  const trilhas = await db.trilha.findMany({
    orderBy: { criadoEm: 'asc' },
    include: { etapas: { select: { _count: { select: { cursos: true } }, cursos: { select: { publicado: true, _count: { select: { perguntas: true, videos: { where: { url: '', arquivo: '' } } } } } } } } },
  });
  return (
    <div className="in">
      <div className="rp-head">
        <div><h1>Conteúdo</h1><p>Trilhas, cursos, vídeos e perguntas da área interna. Só aparece para os colaboradores o que estiver publicado.</p></div>
        <div className="rp-actions"><NovaTrilha /></div>
      </div>
      {trilhas.length ? (
        <div className="in-trilhas">
          {trilhas.map((t) => {
            const cursos = t.etapas.flatMap((e) => e.cursos);
            const semVideo = cursos.reduce((n, c) => n + c._count.videos, 0);
            return (
              <Link key={t.id} className="mod in-trilha" href={`/interno/conteudo/trilhas/${t.id}`}>
                <div className="in-chips">
                  {t.publicada ? <span className="chip chip-teal">Publicada</span> : <span className="chip chip-yellow">Rascunho</span>}
                  {semVideo > 0 && <span className="chip chip-yellow">{semVideo} {semVideo === 1 ? 'vídeo sem link' : 'vídeos sem link'}</span>}
                </div>
                <h3>{t.titulo}</h3>
                <p>{t.etapas.length} {t.etapas.length === 1 ? 'etapa' : 'etapas'} · {cursos.length} cursos ({cursos.filter((c) => c.publicado).length} publicados) · {cursos.reduce((n, c) => n + c._count.perguntas, 0)} perguntas</p>
                <span className="in-meta">Editar trilha</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <section className="tcard"><div className="state"><span className="icon">route</span><b>Nenhuma trilha ainda</b><p>Crie a primeira trilha para montar etapas, cursos, vídeos e perguntas.</p></div></section>
      )}
      <Toaster />
    </div>
  );
}
