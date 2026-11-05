import Link from 'next/link';
import { Toaster } from '@/components/equipe/Toast';
import { db } from '@/lib/db';
import { exigirEditorConteudo } from '@/lib/sessao';
import { EditorCurso } from './EditorCurso';
import '../../../interno.css';

export const metadata = { title: 'Editar curso' };

export default async function EditarCurso({ params }: { params: Promise<{ id: string }> }) {
  await exigirEditorConteudo();
  const { id } = await params;
  const c = await db.curso.findUnique({
    where: { id },
    include: {
      etapa: { include: { trilha: { include: { etapas: { orderBy: { ordem: 'asc' }, select: { id: true, nome: true } } } } } },
      videos: { orderBy: { ordem: 'asc' } }, materiais: { orderBy: { ordem: 'asc' } }, perguntas: { orderBy: { ordem: 'asc' } },
      _count: { select: { tentativas: true } },
    },
  });
  if (!c) return <section className="tcard"><div className="state"><span className="icon">search_off</span><b>Curso não encontrado</b><div className="acts"><Link className="btn btn-l btn-outlined" href="/interno/conteudo">Voltar</Link></div></div></section>;
  const trilha = c.etapa.trilha;
  return (
    <div className="in">
      <nav className="crumb" aria-label="Você está em">
        <Link href="/interno/conteudo">Conteúdo</Link><span className="icon s16">chevron_right</span>
        <Link href={`/interno/conteudo/trilhas/${trilha.id}`}>{trilha.titulo}</Link><span className="icon s16">chevron_right</span>
        <span aria-current="page">{c.titulo}</span>
      </nav>
      <EditorCurso
        trilhaId={trilha.id}
        etapas={trilha.etapas.map((e) => ({ value: e.id, label: e.nome }))}
        tentativas={c._count.tentativas}
        inicial={{
          id: c.id, etapaId: c.etapaId, titulo: c.titulo, area: c.area, resumo: c.resumo, aprender: c.aprender, texto: c.texto, contato: c.contato,
          aprovacao: c.aprovacao, publicado: c.publicado,
          videos: c.videos.map((v) => ({ titulo: v.titulo, duracao: v.duracao, url: v.url, arquivo: v.arquivo, nomeArquivo: v.nomeArquivo })),
          materiais: c.materiais.map((m) => ({ titulo: m.titulo, descricao: m.descricao, url: m.url })),
          perguntas: c.perguntas.map((q) => ({ enunciado: q.enunciado, alternativas: q.alternativas, correta: q.correta })),
        }}
      />
      <Toaster />
    </div>
  );
}
