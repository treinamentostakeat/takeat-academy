import Link from 'next/link';
import { podeEditarConteudo, podeGerirPessoas } from '@/lib/permissoes';
import { exigirPessoa } from '@/lib/sessao';
import { trilhasDoUsuario } from '@/lib/trilhas';
import { BarraProgresso, Capa } from './pecas';
import './interno.css';

export const metadata = { title: 'Onboarding' };

/* Atalhos para o lado do cliente: o colaborador aprende o sistema como o cliente aprende.
   Sem href = ainda não existe; aparece como "Em breve", sem link. */
const SISTEMA: { icon: string; titulo: string; texto: string; href?: string }[] = [
  { icon: 'videocam', titulo: 'Aulas ao vivo', texto: 'Os treinamentos que os clientes fazem, por tema e horário.', href: '/aulas' },
  { icon: 'play_circle', titulo: 'Vídeos do sistema', texto: 'Aulas gravadas sobre cada parte do sistema Takeat.' },
  { icon: 'help', titulo: 'Dúvidas frequentes', texto: 'As perguntas mais comuns dos clientes, respondidas.' },
];

/* Tela inicial do colaborador (painel): continuar de onde parou, trilhas e o sistema visto como cliente. */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ negado?: string }> }) {
  const u = await exigirPessoa();
  const { negado } = await searchParams;
  const trilhas = await trilhasDoUsuario(u);
  const editor = podeEditarConteudo(u.cargo);
  const atual = trilhas.find((t) => t.publicada && t.proximo) ?? null;

  return (
    <div className="in">
      {negado && (
        <div className="notice in-aviso" role="alert"><span className="icon">lock</span>
          <div><b>Esta área é do RH</b>Você foi trazido de volta para o início. Fale com o RH se precisar desse acesso.</div></div>
      )}
      <div className="rp-head">
        <div><h1>Olá, {u.nome.split(' ')[0]}</h1><p>Trilhas e cursos para conhecer como a Takeat funciona.</p></div>
        {(editor || podeGerirPessoas(u.cargo)) && (
          <div className="rp-actions">
            {podeGerirPessoas(u.cargo) && <Link className="btn btn-l btn-outlined" href="/interno/pessoas"><span className="icon">group</span>Pessoas</Link>}
            {editor && <Link className="btn btn-l btn-outlined" href="/interno/conteudo"><span className="icon">edit_note</span>Editar conteúdo</Link>}
          </div>
        )}
      </div>

      {atual && (
        <section className="in-cont" aria-label="Continue de onde parou">
          <div><span className="in-eyebrow">Continue de onde parou</span><h2>{atual.titulo}</h2>
            <BarraProgresso feitos={atual.concluidos} total={atual.total} />
          </div>
          <Link className="btn btn-l btn-filled" href={`/interno/cursos/${atual.proximo!.id}`}><span className="icon">play_arrow</span>{atual.concluidos ? 'Continuar' : 'Começar'}: {atual.proximo!.titulo}</Link>
        </section>
      )}

      <h2 className="in-sec">Suas trilhas</h2>
      {trilhas.length ? (
        <div className="in-trilhas">
          {trilhas.map((t, i) => (
            <Link key={t.id} className="mod in-trilha" href={`/interno/trilhas/${t.id}`}>
              <Capa titulo={t.titulo} etapa={`Trilha · ${t.total} ${t.total === 1 ? 'curso' : 'cursos'}`} indiceEtapa={i} icone="route" imagem={t.capaUrl}
                selo={t.total > 0 && t.concluidos === t.total ? <span className="chip chip-teal"><span className="icon s16">check_circle</span>Concluída</span> : !t.publicada ? <span className="chip chip-yellow">Não publicada</span> : null} />
              <h3>{t.titulo}</h3>
              {t.descricao && <p>{t.descricao}</p>}
              <BarraProgresso feitos={t.concluidos} total={t.total} />
            </Link>
          ))}
        </div>
      ) : (
        <section className="tcard"><div className="state"><span className="icon">route</span><b>Nenhuma trilha publicada ainda</b>
          <p>{editor ? 'Crie a primeira trilha em Editar conteúdo.' : 'Assim que o RH publicar a sua trilha, ela aparece aqui.'}</p>
          {editor && <div className="acts"><Link className="btn btn-l btn-outlined" href="/interno/conteudo">Editar conteúdo</Link></div>}</div></section>
      )}

      <div className="in-sec-h">
        <h2 className="in-sec">Aprenda o sistema, como o cliente</h2>
        <p>Os mesmos treinamentos que os restaurantes fazem.</p>
      </div>
      <div className="in-sistema">
        {SISTEMA.map((s) => {
          const corpo = <><span className="icon in-sis-i">{s.icon}</span><span className="in-sis-t"><b>{s.titulo}</b><small>{s.texto}</small></span>{s.href ? <span className="icon s16">arrow_forward</span> : <span className="chip chip-neutral">Em breve</span>}</>;
          return s.href
            ? <Link key={s.titulo} className="mod in-sis" href={s.href}>{corpo}</Link>
            : <div key={s.titulo} className="mod in-sis off" aria-disabled="true">{corpo}</div>;
        })}
      </div>
    </div>
  );
}
