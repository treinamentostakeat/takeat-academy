import Link from 'next/link';
import { iniciais } from '@/lib/formato';
import { jogoDe } from '@/lib/gamificacao';
import { ROTULO_CARGO } from '@/lib/permissoes';
import { exigirPessoa } from '@/lib/sessao';
import { BarraNivel } from '../jogo';
import { IconeMedalha } from '../visual';

export const metadata = { title: 'Meu perfil' };

const TZ = () => process.env.TZ_AULAS || 'America/Sao_Paulo';
const data = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ() });

/* Perfil: nível, XP, streak, medalhas, certificados e histórico de cursos. */
export default async function Perfil() {
  const u = await exigirPessoa();
  const jogo = await jogoDe(u);
  const ganhas = jogo.conquistas.filter((c) => c.ok);
  const { streak } = jogo.resumo;

  return (
    <>
      <header className="ac-perfil">
        <span className="ac-perfil-av" aria-hidden="true">{iniciais(u.nome)}</span>
        <div>
          <p className="ac-eyebrow">{ROTULO_CARGO[u.cargo]}</p>
          <h1>{u.nome}</h1>
          <p className="ac-perfil-sub">
            <span>{jogo.nivel.nome}</span>
            <span className={`ac-fogo${streak ? '' : ' apagado'}`}><span className="icon" aria-hidden="true">local_fire_department</span>{streak ? `${streak} ${streak === 1 ? 'semana seguida' : 'semanas seguidas'}` : 'Sem sequência ativa'}</span>
          </p>
        </div>
      </header>

      <div className="ac-jogo-topo">
        <BarraNivel jogo={jogo} />
        <div className="ac-nums">
          <div><b>{jogo.resumo.cursos}</b><span>{jogo.resumo.cursos === 1 ? 'curso concluído' : 'cursos concluídos'}</span></div>
          <div><b>{ganhas.length}</b><span>{ganhas.length === 1 ? 'conquista' : 'conquistas'}</span></div>
          <div><b>{jogo.resumo.comandas}</b><span>{jogo.resumo.comandas === 1 ? 'comanda fechada' : 'comandas fechadas'}</span></div>
          <div><b>{jogo.resumo.maiorStreak}</b><span>maior sequência (semanas)</span></div>
        </div>
      </div>

      <section className="ac-sec" aria-labelledby="t-cert">
        <div className="ac-sec-h"><div><h2 id="t-cert">Certificados</h2><p>Um para cada trilha concluída, com código de validação</p></div></div>
        {jogo.certificados.length ? (
          <div className="ac-certs">
            {jogo.certificados.map((c) => (
              <div key={c.trilhaId} className="ac-cert">
                <span className="ac-cert-i" aria-hidden="true"><span className="icon">workspace_premium</span></span>
                <div><b>{c.titulo}</b><small>Concluída em {data(c.em)} · {c.codigo}</small></div>
                <a className="ac-btn sec" href={`/interno/certificado/${c.trilhaId}`}><span className="icon" aria-hidden="true">download</span>Baixar PDF</a>
              </div>
            ))}
          </div>
        ) : <p className="ac-muted">Conclua todos os cursos de uma trilha para receber o certificado.</p>}
      </section>

      <section className="ac-sec" aria-labelledby="t-med">
        <div className="ac-sec-h"><div><h2 id="t-med">Medalhas</h2><p>{ganhas.length ? 'As conquistas que você já tem' : 'Você ainda não tem conquistas'}</p></div><Link className="ac-voltar" href="/interno/conquistas">Ver o cardápio completo<span className="icon s16" aria-hidden="true">arrow_forward</span></Link></div>
        {ganhas.length > 0 && (
          <ul className="ac-medalhas">
            {ganhas.map((c) => <li key={c.id}><span className="icon" aria-hidden="true">{c.icone}</span><b>{c.nome}</b></li>)}
          </ul>
        )}
      </section>

      <div className="ac-duo">
        <section aria-labelledby="t-hist">
          <div><h2 id="t-hist">Histórico de cursos</h2><p>Do mais recente para o mais antigo</p></div>
          {jogo.historico.length ? (
            <ul className="ac-hist">
              {jogo.historico.map((h) => (
                <li key={h.cursoId}>
                  <IconeMedalha />
                  <Link href={`/interno/cursos/${h.cursoId}`}>{h.titulo}</Link>
                  <span>{h.acertos}/{h.total} · {data(h.concluidoEm)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="ac-muted">Nenhum curso concluído ainda.</p>}
          <p className="ac-muted peq">As aulas ao vivo internas entram neste histórico quando a agenda estiver no ar.</p>
        </section>
        <section aria-labelledby="t-xp">
          <div><h2 id="t-xp">De onde vem o seu XP</h2><p>Total de {jogo.xp.toLocaleString('pt-BR')} XP</p></div>
          {jogo.extrato.length ? (
            <ul className="ac-extrato">
              {jogo.extrato.map((l) => <li key={l.motivo}><span>{l.motivo}</span><b>+{l.xp.toLocaleString('pt-BR')}</b></li>)}
            </ul>
          ) : <p className="ac-muted">Conclua o primeiro curso para ganhar XP.</p>}
        </section>
      </div>
    </>
  );
}
