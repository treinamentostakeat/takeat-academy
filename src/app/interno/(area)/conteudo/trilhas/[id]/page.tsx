import Link from 'next/link';
import { Toaster } from '@/components/equipe/Toast';
import { db } from '@/lib/db';
import { exigirEditorConteudo } from '@/lib/sessao';
import { EditorTrilha } from './EditorTrilha';
import '../../../interno.css';

export const metadata = { title: 'Editar trilha' };

export default async function EditarTrilha({ params }: { params: Promise<{ id: string }> }) {
  await exigirEditorConteudo();
  const { id } = await params;
  const t = await db.trilha.findUnique({
    where: { id },
    include: { etapas: { orderBy: { ordem: 'asc' }, include: { cursos: { orderBy: { ordem: 'asc' }, select: { id: true, titulo: true, publicado: true, _count: { select: { perguntas: true, videos: { where: { url: '' } } } } } } } } },
  });
  if (!t) return <section className="tcard"><div className="state"><span className="icon">search_off</span><b>Trilha não encontrada</b><div className="acts"><Link className="btn btn-l btn-outlined" href="/interno/conteudo">Voltar</Link></div></div></section>;
  return (
    <div className="in">
      <nav className="crumb" aria-label="Você está em"><Link href="/interno/conteudo">Conteúdo</Link><span className="icon s16">chevron_right</span><span aria-current="page">{t.titulo}</span></nav>
      <EditorTrilha
        trilha={{ id: t.id, titulo: t.titulo, descricao: t.descricao, publico: t.publico, publicada: t.publicada }}
        etapas={t.etapas.map((e) => ({ id: e.id, nome: e.nome, descricao: e.descricao, cursos: e.cursos.map((c) => ({ id: c.id, titulo: c.titulo, publicado: c.publicado, perguntas: c._count.perguntas, semVideo: c._count.videos })) }))}
      />
      <Toaster />
    </div>
  );
}
