import { desafioDasTurmas, jogoDe } from '@/lib/gamificacao';
import { exigirPessoa } from '@/lib/sessao';
import { db } from '@/lib/db';
import { podeEditarConteudo } from '@/lib/permissoes';
import { BarraNivel, Cardapio, Comanda, DesafioTurmas, Passaporte } from '../jogo';

export const metadata = { title: 'Conquistas' };

/* Conquistas: nível e XP, comanda da semana, passaporte dos setores, cardápio de conquistas e desafio entre turmas. */
export default async function Conquistas() {
  const u = await exigirPessoa();
  const jogo = await jogoDe(u);
  const editor = podeEditarConteudo(u.cargo);
  // Desafio: cursos da primeira trilha visível
  const trilha = await db.trilha.findFirst({
    where: editor ? {} : { publicada: true }, orderBy: { criadoEm: 'asc' },
    select: { etapas: { select: { cursos: { where: editor ? {} : { publicado: true }, select: { id: true } } } } },
  });
  const turmas = trilha ? await desafioDasTurmas(trilha.etapas.flatMap((e) => e.cursos.map((c) => c.id)), u.id) : [];

  return (
    <>
      <header className="ac-pg-h">
        <p className="ac-eyebrow">Conquistas</p>
        <h1>A sua <em>cozinha</em> na Academy</h1>
        <p className="lead">Cada curso, quiz e missão vale XP. Suba de Ajudante a Chef Executivo, feche a comanda da semana e carimbe o passaporte dos setores.</p>
      </header>

      <div className="ac-jogo-topo">
        <BarraNivel jogo={jogo} />
        <Comanda jogo={jogo} mesa={u.nome.split(' ')[0]} />
      </div>

      <Passaporte jogo={jogo} />
      <Cardapio jogo={jogo} />
      <DesafioTurmas turmas={turmas} />
    </>
  );
}
