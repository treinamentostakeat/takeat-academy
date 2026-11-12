import Link from 'next/link';
import { podeEditarConteudo } from '@/lib/permissoes';
import { exigirPessoa } from '@/lib/sessao';
import { trilhasDoUsuario } from '@/lib/trilhas';
import { DecoCapelo, DecoTrilha, Progresso } from './visual';
import './interno.css';

export const metadata = { title: 'Início' };

/* Treinamentos do lado do cliente: o colaborador aprende o sistema como o cliente aprende.
   Sem href = ainda não existe; aparece como teaser. "breve" = mês previsto (sem mês, o teaser fica sem data). */
const SISTEMA: { icon: string; titulo: string; texto: string; href?: string; mais?: string; breve?: string }[] = [
  { icon: 'videocam', titulo: 'Aulas ao vivo', texto: 'Os treinamentos que os clientes fazem, por tema e horário.', href: '/aulas', mais: 'Ver agenda' },
  { icon: 'play_circle', titulo: 'Vídeos do sistema', texto: 'Aulas gravadas sobre cada parte do sistema Takeat.' },
  { icon: 'help', titulo: 'Dúvidas frequentes', texto: 'As perguntas mais comuns dos clientes, respondidas.' },
];

/* Início da Academy: faixa de boas-vindas, trilhas e o sistema visto como cliente. */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ negado?: string }> }) {
  const u = await exigirPessoa();
  const { negado } = await searchParams;
  const trilhas = await trilhasDoUsuario(u);
  const editor = podeEditarConteudo(u.cargo);

  return (
    <>
      {negado && (
        <div className="ac-aviso" role="alert"><span className="icon" aria-hidden="true">lock</span>
          <div><b>Esta área é do RH</b>Você foi trazido de volta para o início. Fale com o RH se precisar desse acesso.</div></div>
      )}

      <section className="ac-hero">
        <div className="ac-brilho" aria-hidden="true" />
        <DecoCapelo />
        <p className="ac-eyebrow">Takeat Academy</p>
        <h1>Olá, {u.nome.split(' ')[0]}. O que vamos <em>aprender</em> hoje?</h1>
        <p className="lead">Trilhas e cursos para conhecer como a Takeat funciona, do primeiro dia em diante.</p>
      </section>

      <section className="ac-sec" aria-labelledby="t-trilhas">
        <div className="ac-sec-h"><h2 id="t-trilhas">Suas trilhas</h2></div>
        {trilhas.length ? (
          <div className="ac-trilhas">
            {trilhas.map((t) => {
              const concluida = t.total > 0 && t.concluidos === t.total;
              return (
                <Link key={t.id} className="ac-tcard" href={`/interno/trilhas/${t.id}`}>
                  <div className={`ac-tcapa${t.capaUrl ? ' foto' : ''}`}>
                    {t.capaUrl
                      // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage
                      ? <img src={t.capaUrl} alt="" />
                      : <DecoTrilha />}
                    <span className="ac-tcapa-t">Trilha · {t.total} {t.total === 1 ? 'curso' : 'cursos'}</span>
                    <span className="ac-tcapa-s">
                      {concluida && <span className="ac-selo ok"><span className="icon" aria-hidden="true">check_circle</span>Concluída</span>}
                      {!t.publicada && <span className="ac-selo am">Não publicada</span>}
                    </span>
                  </div>
                  <div className="ac-tcorpo">
                    <h3>{t.titulo}</h3>
                    {t.descricao && <p>{t.descricao}</p>}
                    <Progresso feitos={t.concluidos} total={t.total} />
                    <span className="ac-btn prim">{concluida ? 'Rever trilha' : t.concluidos ? 'Continuar trilha' : 'Abrir trilha'}<span className="icon" aria-hidden="true">arrow_forward</span></span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="ac-vazio">
            <span className="ac-ic" aria-hidden="true"><span className="icon">route</span></span>
            <p className="ac-eyebrow">Em construção</p>
            <b>Nenhuma trilha publicada ainda</b>
            <p>{editor ? 'Crie a primeira trilha em Editar conteúdo, no menu.' : 'Assim que o RH publicar a sua trilha, ela aparece aqui.'}</p>
          </div>
        )}
      </section>

      <section className="ac-sec" aria-labelledby="t-sistema">
        <div className="ac-sec-h"><div><h2 id="t-sistema">Aprenda o sistema, como o cliente</h2><p>Os mesmos treinamentos que os restaurantes fazem</p></div></div>
        <div className="ac-sistema">
          {SISTEMA.map((s) => s.href ? (
            <Link key={s.titulo} className="ac-sis" href={s.href}>
              <div className="ac-sis-h"><span className="ac-ic red" aria-hidden="true"><span className="icon">{s.icon}</span></span><span className="ac-aovivo">● AO VIVO</span></div>
              <b>{s.titulo}</b><p>{s.texto}</p>
              <span className="mais">{s.mais} →</span>
            </Link>
          ) : (
            <div key={s.titulo} className="ac-sis off">
              <span className="ac-ic" aria-hidden="true"><span className="icon">{s.icon}</span></span>
              <b>{s.titulo}</b><p>{s.texto}</p>
              {s.breve && <span className="breve">Chega em {s.breve}</span>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
