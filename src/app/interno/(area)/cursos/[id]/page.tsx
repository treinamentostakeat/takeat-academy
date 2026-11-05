import Link from 'next/link';
import { exigirPessoa } from '@/lib/sessao';
import { podeEditarConteudo } from '@/lib/permissoes';
import { cursoParaAluno } from '@/lib/trilhas';
import { CursoAluno } from './CursoAluno';
import '../../interno.css';

export const metadata = { title: 'Curso' };

export default async function Curso({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigirPessoa();
  const { id } = await params;
  const c = await cursoParaAluno(id, u);
  if (!c) {
    return (
      <section className="tcard"><div className="state"><span className="icon">search_off</span><b>Curso não encontrado</b><p>Ele pode ter sido removido ou ainda não foi publicado.</p>
        <div className="acts"><Link className="btn btn-l btn-outlined" href="/interno">Voltar ao início</Link></div></div></section>
    );
  }
  return (
    <div className="in">
      <nav className="crumb" aria-label="Você está em">
        <Link href="/interno">Início</Link><span className="icon s16">chevron_right</span>
        <Link href={`/interno/trilhas/${c.trilha.id}`}>{c.trilha.titulo}</Link><span className="icon s16">chevron_right</span>
        <span aria-current="page">{c.titulo}</span>
      </nav>
      <CursoAluno curso={c} editar={podeEditarConteudo(u.cargo) ? `/interno/conteudo/cursos/${c.id}` : null} />
    </div>
  );
}
