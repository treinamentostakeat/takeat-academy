import Link from 'next/link';
import { redirect } from 'next/navigation';
import { iniciais } from '@/lib/formato';
import { podeEditarConteudo } from '@/lib/permissoes';
import { exigirPessoa } from '@/lib/sessao';
import { diaDaJornada, trilhasDoUsuario, turmaDe, vistaDaTrilha } from '@/lib/trilhas';
import { AnelProgresso, CapaCurso, DecoBlocos, FUNDOS_SETOR, iniciaisDe } from '../../visual';
import '../../interno.css';

export const metadata = { title: 'Minha trilha' };

/* Home da trilha: comece por aqui, progresso em anel, mapa da jornada, cursos por etapa e a turma.
   A primeira etapa aparece com capas grandes (os fundamentos); as demais, em cards compactos. */
export default async function Trilha({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigirPessoa();
  const { id } = await params;
  const t = (await trilhasDoUsuario(u)).find((x) => x.id === id);
  if (!t) {
    return (
      <div className="ac-vazio">
        <span className="ac-ic" aria-hidden="true"><span className="icon">search_off</span></span>
        <b>Trilha não encontrada</b><p>Ela pode ter sido removida ou ainda não foi publicada.</p>
        <Link className="ac-btn sec" href="/interno">Voltar ao início</Link>
      </div>
    );
  }
  // Primeira abertura: boas-vindas antes da home da trilha
  const vista = await vistaDaTrilha(u.id, t.id);
  if (!vista) redirect(`/interno/boas-vindas/${t.id}`);

  const editor = podeEditarConteudo(u.cargo);
  const etapas = t.etapas.filter((e) => e.cursos.length);
  const feitosDa = (e: (typeof etapas)[number]) => e.cursos.filter((c) => t.notas.has(c.id)).length;
  const etapaAtual = t.proximo ? etapas.find((e) => e.cursos.some((c) => c.id === t.proximo!.id)) ?? null : null;
  const posAtual = etapaAtual ? etapaAtual.cursos.findIndex((c) => c.id === t.proximo!.id) + 1 : 0;
  const turma = await turmaDe(u.id, etapas.flatMap((e) => e.cursos.map((c) => c.id)));

  return (
    <>
      <header className="ac-th">
        <div>
          <p>Dia {diaDaJornada(vista)} da sua jornada · {t.titulo}</p>
          <h1>Olá, {u.nome.split(' ')[0]}</h1>
        </div>
        <div className="ac-th-acts">
          {!t.publicada && <span className="ac-pilula am">Não publicada</span>}
          {editor && <Link className="ac-btn sec" href={`/interno/conteudo/trilhas/${t.id}`}><span className="icon" aria-hidden="true">edit</span>Editar trilha</Link>}
        </div>
      </header>

      <section className="ac-cont" aria-label="Continue de onde parou">
        <div className="ac-comece">
          <DecoBlocos />
          {t.proximo && etapaAtual ? (
            <>
              <p className="ac-eyebrow">{t.concluidos ? 'Continue de onde parou' : 'Comece por aqui'} · {etapaAtual.nome} {posAtual} de {etapaAtual.cursos.length}</p>
              <h2>{t.proximo.titulo}</h2>
              {t.proximo.resumo && <p className="lead">{t.proximo.resumo}</p>}
              <div className="ac-comece-acts">
                <Link className="ac-btn branco" href={`/interno/cursos/${t.proximo.id}`}><span className="icon" aria-hidden="true">play_arrow</span>{t.concluidos ? 'Continuar' : 'Começar curso'}</Link>
                {t.proximo._count.perguntas > 0 && <span className="ac-pilula">● Quiz de {t.proximo._count.perguntas} perguntas</span>}
              </div>
            </>
          ) : (
            <>
              <p className="ac-eyebrow">{t.total ? 'Trilha concluída' : 'Em construção'}</p>
              <h2>{t.total ? 'Você se formou nesta trilha' : 'Os cursos desta trilha estão chegando'}</h2>
              <p className="lead">{t.total ? 'Todos os cursos concluídos. Pode rever qualquer um quando quiser.' : 'Assim que o RH publicar os cursos, eles aparecem aqui.'}</p>
            </>
          )}
        </div>
        <div className="ac-anel-box">
          <p className="ac-label">Seu progresso</p>
          <AnelProgresso feitos={t.concluidos} total={t.total} />
          <div className="ac-pilulas">
            <span className="ac-pilula">{t.concluidos} {t.concluidos === 1 ? 'medalha' : 'medalhas'}</span>
            <span className="ac-pilula">{t.total - t.concluidos === 0 && t.total ? 'Formatura concluída' : 'Formatura ao final'}</span>
          </div>
        </div>
      </section>

      {etapas.length > 0 && (
        <section className="ac-sec" aria-labelledby="t-jornada">
          <h2 id="t-jornada">Sua jornada</h2>
          <div className="ac-mapa">
            {etapas.map((e, i) => {
              const feitos = feitosDa(e), feita = feitos === e.cursos.length, aqui = e === etapaAtual;
              return (
                <a key={e.id} href={`#etapa-${e.id}`} className={aqui ? 'aqui' : feita ? 'feita' : undefined} aria-current={aqui ? 'step' : undefined}>
                  <div className="ac-mapa-h">
                    <span className="ac-num">{feita ? <span className="icon" aria-hidden="true">check</span> : i + 1}</span>
                    {aqui && <span>VOCÊ ESTÁ AQUI</span>}
                  </div>
                  <b>{e.nome}</b>
                  <small>{feitos} de {e.cursos.length} {e.cursos.length === 1 ? 'curso' : 'cursos'}</small>
                </a>
              );
            })}
            <div className="forma">
              <span className="ac-num"><span className="icon" aria-hidden="true">school</span></span>
              <b>Formatura</b>
              <small>{t.total && t.concluidos === t.total ? 'Concluída' : `Ao concluir os ${t.total} cursos`}</small>
            </div>
          </div>
        </section>
      )}

      {etapas.map((e, i) => {
        const feitos = feitosDa(e);
        return (
          <section key={e.id} id={`etapa-${e.id}`} className="ac-sec" aria-labelledby={`t-${e.id}`}>
            <div className="ac-sec-h">
              <div><h2 id={`t-${e.id}`}>{e.nome}</h2>{e.descricao && <p>{e.descricao}</p>}</div>
              <span className={`ac-pilula${feitos === e.cursos.length ? ' ok' : ''}`}>{feitos}/{e.cursos.length}</span>
            </div>
            {i === 0 ? (
              <div className="ac-cursos">
                {e.cursos.map((c, k) => {
                  const nota = t.notas.get(c.id);
                  return (
                    <Link key={c.id} className="ac-ccard" href={`/interno/cursos/${c.id}`}>
                      <CapaCurso indice={k} numero={String(k + 1).padStart(2, '0')}
                        selo={nota ? <span className="ac-selo ok"><span className="icon" aria-hidden="true">check_circle</span>{nota.acertos}/{nota.total}</span> : !c.publicado ? <span className="ac-selo am">Não publicado</span> : null} />
                      <div className="ac-ccorpo">
                        <h3>{c.titulo}</h3>
                        <p>{c.resumo}</p>
                        <div className="ac-ccorpo-f">
                          <span>{[c.area, c._count.perguntas ? `${c._count.perguntas} perguntas` : ''].filter(Boolean).join(' · ')}</span>
                          <span className={`med${nota ? ' ok' : ''}`}>{nota ? 'Medalha conquistada' : '+ medalha'}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="ac-setores">
                {e.cursos.map((c, k) => {
                  const nota = t.notas.get(c.id);
                  return (
                    <Link key={c.id} className="ac-setor" href={`/interno/cursos/${c.id}`}>
                      <span className="ac-setor-h">
                        <span className="ac-ini" style={{ background: FUNDOS_SETOR[k % FUNDOS_SETOR.length] }} aria-hidden="true">{iniciaisDe(c.titulo)}</span>
                        {nota ? <span className="ac-selo ok"><span className="icon" aria-hidden="true">check_circle</span>Feito</span> : !c.publicado ? <span className="ac-selo am">Oculto</span> : null}
                      </span>
                      <b>{c.titulo}</b>
                      <span className="ac-barra" aria-hidden="true"><i style={{ width: nota ? '100%' : '0%' }} /></span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <section className="ac-duo">
        {turma.pessoas.length > 0 && (
          <div>
            <div><h2>Sua turma</h2><p>Quem chegou em {turma.mes} com você</p></div>
            {turma.pessoas.map((p) => (
              <div key={p.id} className="ac-pessoa">
                <span className="ac-av" aria-hidden="true">{p.eu ? iniciais(u.nome) : iniciais(p.nome)}</span>
                <div><p>{p.nome}</p><div className="ac-barra" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${p.nome}`}><i style={{ width: `${p.pct}%` }} /></div></div>
                <span>{p.pct}%</span>
              </div>
            ))}
          </div>
        )}
        <div>
          <div><h2>Aprenda o sistema como o cliente</h2><p>Os mesmos treinamentos que os restaurantes fazem</p></div>
          <Link className="ac-lin" href="/aulas">
            <span className="ac-ic red peq" aria-hidden="true"><span className="icon">videocam</span></span>
            <span><b>Aulas ao vivo</b><small>Por tema e horário</small></span>
            <span className="ac-aovivo">● AO VIVO</span>
          </Link>
          <div className="ac-lin off">
            <span className="ac-ic peq" aria-hidden="true"><span className="icon">play_circle</span></span>
            <span><b>Vídeos do sistema e dúvidas frequentes</b><small>Em preparação</small></span>
          </div>
        </div>
      </section>
    </>
  );
}
