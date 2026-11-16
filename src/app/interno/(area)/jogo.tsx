import Link from 'next/link';
import { XP, type Secao } from '@/lib/gamificacao-regras';
import type { JogoCompleto } from '@/lib/gamificacao';
import { iniciaisDe } from './visual';

/* Peças da gamificação: comanda da semana, passaporte dos setores, cardápio de conquistas e barra de nível. */

const TZ = () => process.env.TZ_AULAS || 'America/Sao_Paulo';
const curta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ() });

/** Barra de nível: nome do nível, XP e quanto falta para o próximo */
export function BarraNivel({ jogo }: { jogo: JogoCompleto }) {
  const { nivel, xp } = jogo;
  return (
    <div className="ac-nivel">
      <div className="ac-nivel-h">
        <span><small>Nível {nivel.indice + 1}</small><b>{nivel.nome}</b></span>
        <span className="ac-nivel-xp">{xp.toLocaleString('pt-BR')} XP</span>
      </div>
      <div className="ac-nivel-barra" role="progressbar" aria-valuenow={nivel.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso até ${nivel.prox?.nome ?? 'o nível máximo'}`}><i style={{ width: `${nivel.pct}%` }} /></div>
      <p>{nivel.prox ? <>Faltam <b>{nivel.prox.falta.toLocaleString('pt-BR')} XP</b> para {nivel.prox.nome}</> : 'Você chegou ao nível máximo da cozinha.'}</p>
    </div>
  );
}

/** Comanda da semana: 3 missões no formato de comanda de restaurante */
export function Comanda({ jogo, mesa }: { jogo: JogoCompleto; mesa: string }) {
  const c = jogo.comanda;
  const n = Math.round((Date.parse(c.semana) - Date.parse(c.semana.slice(0, 4) + '-01-01')) / (7 * 86400000)) + 1;
  const feitos = c.itens.filter((i) => i.ok).length;
  return (
    <article className={`ac-comanda${c.fechada ? ' fechada' : ''}`} aria-label="Comanda da semana">
      <header>
        <span>Comanda nº {String(n).padStart(2, '0')}</span>
        <span>Mesa: {mesa}</span>
      </header>
      <p className="ac-comanda-t">Missões da semana</p>
      <ul>
        {c.itens.map((i) => (
          <li key={i.id} className={i.ok ? 'ok' : undefined}>
            <span className="ck" aria-hidden="true">{i.ok ? '✓' : ''}</span>
            <span className="tx">{i.texto}</span>
            <span className="qt">{i.feito}/{i.meta}</span>
          </li>
        ))}
      </ul>
      <footer>
        <span>{c.fechada ? 'Comanda fechada' : `${feitos} de ${c.itens.length} itens`}</span>
        <b>+{XP.comandaFechada} XP</b>
      </footer>
      {c.fechada && <span className="ac-comanda-carimbo" aria-hidden="true">Pago</span>}
      <p className="ac-comanda-pe">Novas missões toda segunda-feira</p>
    </article>
  );
}

/** Passaporte dos setores: cada setor concluído vira um carimbo */
export function Passaporte({ jogo }: { jogo: JogoCompleto }) {
  const p = jogo.passaporte;
  if (!p) return null;
  const feitos = p.carimbos.filter((c) => c.em).length;
  const completo = feitos === p.carimbos.length && feitos > 0;
  return (
    <section className="ac-passaporte" id="passaporte" aria-labelledby="t-passaporte">
      <div className="ac-passaporte-h">
        <div>
          <p className="ac-eyebrow">Passaporte dos setores</p>
          <h2 id="t-passaporte">{p.etapa}</h2>
          <p>{completo ? 'Todos os setores carimbados. Selo de formatura conquistado!' : `${feitos} de ${p.carimbos.length} carimbos. Cada setor concluído carimba o seu passaporte.`}</p>
        </div>
        <span className={`ac-selo-forma${completo ? ' ok' : ''}`} aria-label={completo ? 'Selo de formatura conquistado' : 'Selo de formatura ainda não conquistado'}>
          <span className="icon" aria-hidden="true">school</span>
        </span>
      </div>
      <ol className="ac-carimbos">
        {p.carimbos.map((c, i) => (
          <li key={c.id}>
            <Link href={`/interno/cursos/${c.id}`} className={`ac-carimbo${c.em ? ' ok' : ''}`} style={{ '--giro': `${((i * 37) % 17) - 8}deg` } as React.CSSProperties}>
              <span className="ini" aria-hidden="true">{iniciaisDe(c.titulo)}</span>
              <span className="nm">{c.titulo}</span>
              <span className="dt">{c.em ? curta(c.em) : 'A carimbar'}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Cardápio de conquistas: as conquistadas em dourado, as outras em silhueta com a dica */
export function Cardapio({ jogo }: { jogo: JogoCompleto }) {
  const secoes: Secao[] = ['Entradas', 'Pratos principais', 'Sobremesas'];
  const total = jogo.conquistas.filter((c) => c.ok).length;
  return (
    <section className="ac-cardapio" aria-labelledby="t-cardapio">
      <header>
        <p className="ac-eyebrow">Takeat Academy</p>
        <h2 id="t-cardapio">Cardápio de <em>conquistas</em></h2>
        <p>{total} de {jogo.conquistas.length} pratos já servidos</p>
      </header>
      {secoes.map((s) => (
        <div key={s} className="ac-cardapio-sec">
          <h3>{s}</h3>
          <ul>
            {jogo.conquistas.filter((c) => c.secao === s).map((c) => (
              <li key={c.id} className={c.ok ? 'ok' : 'falta'}>
                <span className="ic" aria-hidden="true"><span className="icon">{c.ok ? c.icone : 'lock'}</span></span>
                <span className="tx"><b>{c.nome}</b><small>{c.dica}</small></span>
                <span className="pontos" aria-hidden="true" />
                <span className="st">{c.ok ? 'Conquistada' : 'Em breve no seu prato'}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** Desafio entre turmas: % médio de conclusão por turma de entrada */
export function DesafioTurmas({ turmas }: { turmas: { chave: string; nome: string; pessoas: number; pct: number; minha: boolean }[] }) {
  if (turmas.length < 2) return null;
  return (
    <section className="ac-desafio" aria-labelledby="t-desafio">
      <p className="ac-eyebrow">Desafio entre turmas</p>
      <h2 id="t-desafio">Qual turma está mais adiantada?</h2>
      <ol>
        {turmas.map((t, i) => (
          <li key={t.chave} className={t.minha ? 'minha' : undefined}>
            <span className="pos">{i + 1}º</span>
            <span className="nm"><b>{t.nome}{t.minha && <small> · sua turma</small>}</b><small>{t.pessoas} {t.pessoas === 1 ? 'pessoa' : 'pessoas'}</small></span>
            <span className="br" aria-hidden="true"><i style={{ width: `${t.pct}%` }} /></span>
            <span className="pc">{t.pct}%</span>
          </li>
        ))}
      </ol>
      <p className="ac-desafio-pe">Média de conclusão da trilha por turma de entrada.</p>
    </section>
  );
}
