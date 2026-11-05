import Link from 'next/link';
import { podeEditarConteudo } from '@/lib/permissoes';
import { exigirPessoa } from '@/lib/sessao';
import { trilhasDoUsuario } from '@/lib/trilhas';
import { BarraProgresso } from '../../pecas';
import '../../interno.css';

export const metadata = { title: 'Trilha' };

export default async function Trilha({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigirPessoa();
  const { id } = await params;
  const t = (await trilhasDoUsuario(u)).find((x) => x.id === id);
  if (!t) {
    return <section className="tcard"><div className="state"><span className="icon">search_off</span><b>Trilha não encontrada</b><p>Ela pode ter sido removida ou ainda não foi publicada.</p>
      <div className="acts"><Link className="btn btn-l btn-outlined" href="/interno">Voltar ao início</Link></div></div></section>;
  }
  return (
    <div className="in">
      <nav className="crumb" aria-label="Você está em"><Link href="/interno">Início</Link><span className="icon s16">chevron_right</span><span aria-current="page">{t.titulo}</span></nav>
      <div className="in-thead">
        <div className="mod">
          <div className="in-chips">
            <span className="chip chip-red">Trilha · {t.total} cursos</span>
            {t.publico && <span className="chip chip-neutral">{t.publico}</span>}
            {!t.publicada && <span className="chip chip-yellow">Não publicada</span>}
          </div>
          <h1>{t.titulo}</h1>
          {t.descricao && <p>{t.descricao} Faça os cursos na ordem que preferir; a ordem abaixo é a sugerida.</p>}
          {podeEditarConteudo(u.cargo) && <Link className="btn btn-m btn-outlined in-editar" href={`/interno/conteudo/trilhas/${t.id}`}><span className="icon">edit</span>Editar trilha</Link>}
        </div>
        <div className="mod in-side">
          <span className="in-eyebrow">Seu progresso</span>
          <BarraProgresso feitos={t.concluidos} total={t.total} />
          {t.proximo
            ? <Link className="btn btn-l btn-filled" href={`/interno/cursos/${t.proximo.id}`}>{t.concluidos ? 'Continuar' : 'Começar'}: {t.proximo.titulo}</Link>
            : t.total > 0 && <span className="chip chip-teal">Trilha concluída</span>}
        </div>
      </div>
      {t.etapas.filter((e) => e.cursos.length).map((e) => (
        <section key={e.id} className="in-etapa">
          <div className="in-etapa-h"><h2>{e.nome}</h2><span>{e.cursos.filter((c) => t.notas.has(c.id)).length}/{e.cursos.length}</span>{e.descricao && <p>{e.descricao}</p>}</div>
          <div className="in-cursos">
            {e.cursos.map((c) => {
              const nota = t.notas.get(c.id);
              return (
                <Link key={c.id} className="mod in-ccard" href={`/interno/cursos/${c.id}`}>
                  <div className="in-chips">
                    {nota ? <span className="chip chip-teal">Concluído · {nota.acertos}/{nota.total}</span> : <span className="chip chip-neutral">Disponível</span>}
                    {!c.publicado && <span className="chip chip-yellow">Não publicado</span>}
                  </div>
                  <h3>{c.titulo}</h3>
                  {c.resumo && <p>{c.resumo}</p>}
                  <span className="in-meta">{c.area && `${c.area} · `}{c._count.perguntas} perguntas</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
