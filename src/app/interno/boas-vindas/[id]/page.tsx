import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exibicaoDeVideo } from '@/lib/aprendizagem';
import { db } from '@/lib/db';
import { exigirPessoa } from '@/lib/sessao';
import { nomeDoMes, registrarVista, trilhasDoUsuario } from '@/lib/trilhas';
import { VideoBoasVindas } from './VideoBoasVindas';
import '../../(area)/academy.css';

export const metadata = { title: 'Boas-vindas' };

/* Boas-vindas da trilha: aparece na primeira vez que a pessoa abre a trilha (a home da trilha manda para cá).
   Abrir esta tela já conta como "viu"; "Pular introdução" e "Começar minha jornada" levam para a home da trilha. */
export default async function BoasVindas({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigirPessoa();
  const { id } = await params;
  const t = (await trilhasDoUsuario(u)).find((x) => x.id === id);
  if (!t) notFound();
  await registrarVista(u.id, t.id);
  const extra = await db.trilha.findUnique({ where: { id: t.id }, select: { boasVindas: true } });
  const eu = await db.usuario.findUnique({ where: { id: u.id }, select: { criadoEm: true } });
  const video = extra?.boasVindas ? exibicaoDeVideo(extra.boasVindas) : null;
  const etapas = t.etapas.filter((e) => e.cursos.length).slice(0, 3);
  const home = `/interno/trilhas/${t.id}`;

  return (
    <div className="ac ac-solo">
      <div className="ac-bv">
        <div className="ac-brilho" aria-hidden="true" />
        <div className="ac-aro" aria-hidden="true" />
        <header className="ac-bv-top">
          <span className="ac-marca"><span className="ac-marca-t">Takeat</span><span className="ac-marca-s">ACADEMY</span></span>
          <Link className="pular" href={home}>Pular introdução</Link>
        </header>

        <main className="ac-bv-main">
          <section className="ac-bv-txt">
            <p className="ac-eyebrow">{t.titulo}{eu ? ` · Turma de ${nomeDoMes(eu.criadoEm)}` : ''}</p>
            <h1>Boas-vindas à Takeat, <em>{u.nome.split(' ')[0]}.</em></h1>
            <div className="ac-bv-risco" aria-hidden="true" />
            <p className="lead">{t.descricao || 'Aqui você conhece como a Takeat funciona por dentro: as ferramentas, as políticas, cada setor e o produto que os restaurantes usam todo dia.'} No seu ritmo, na ordem que preferir.</p>
            <div className="ac-bv-acts">
              <Link className="ac-btn prim grande" href={home}>Começar minha jornada<span className="icon" aria-hidden="true">arrow_forward</span></Link>
              {video && <a className="ac-btn sec grande" href="#video"><span className="icon" aria-hidden="true">play_circle</span>Ver o vídeo de boas-vindas</a>}
            </div>
          </section>

          {video && (
            <section id="video" className="ac-bv-video" aria-label="Vídeo de boas-vindas">
              <VideoBoasVindas video={video} />
            </section>
          )}
        </main>

        {etapas.length > 0 && (
          <section className="ac-bv-passos" aria-label="Sua jornada">
            <div>
              {etapas.map((e, i) => (
                <div key={e.id} className="ac-passo">
                  <span className="ac-num" aria-hidden="true">{i + 1}</span>
                  <p><b>{e.nome}</b><small>{e.descricao || `${e.cursos.length} ${e.cursos.length === 1 ? 'curso' : 'cursos'}`}</small></p>
                </div>
              ))}
              <div className="ac-passo">
                <span className="ac-num am" aria-hidden="true"><span className="icon">workspace_premium</span></span>
                <p><b>Formatura</b><small>Concluiu os {t.total} cursos? Você se forma na Academy.</small></p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
