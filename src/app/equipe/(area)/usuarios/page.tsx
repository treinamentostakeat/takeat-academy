import { exigirUsuario } from '@/lib/sessao';
import { db } from '@/lib/db';
import { hoje } from '@/lib/datas';
import { Toaster } from '@/components/equipe/Toast';
import { UsuariosTabela, type Linha } from './UsuariosTabela';
import './usuarios.css';

export const metadata = { title: 'Usuários e cargos' };

const fmtAcesso = (d: Date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(d).replace(', ', ' às ');

/* Permissões que existem na fase 1 */
const PERM: ([string] | [string, boolean, boolean, string?])[] = [
  ['Operação'],
  ['Ver a agenda e o detalhe das turmas', true, true, 'Inscritos, presença, avaliações e dúvidas tiradas.'],
  ['Abrir a sala e dar aula', true, true],
  ['Trocar instrutor de uma turma', true, false, 'Vale só para a turma; a grade modelo não muda.'],
  ['Cancelar turma', true, false, 'Os inscritos recebem aviso automático no WhatsApp.'],
  ['Editar a grade modelo', true, false],
  ['Administração'],
  ['Usuários e cargos', true, false, 'Adicionar pessoas, trocar cargo, gerar senha e desativar.'],
  ['Trocar a própria senha', true, true, 'Em Minha conta.'],
];

function Bool({ v }: { v: boolean }) {
  return v
    ? <span className="bool yes" role="img" aria-label="Pode"><span className="icon fill">check_circle</span></span>
    : <span className="bool no" role="img" aria-label="Não pode"><span className="icon">remove</span></span>;
}

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string; cargo?: string; sit?: string }> }) {
  const eu = await exigirUsuario({ gestor: true });
  const sp = await searchParams;
  const hj = hoje();
  const [usuarios, aulas, plantoes] = await Promise.all([
    db.usuario.findMany({ select: { id: true, nome: true, email: true, cargo: true, ativo: true, ultimoAcesso: true } }),
    db.turma.groupBy({ by: ['instrutorId'], where: { status: 'agendada', data: { gte: hj } }, _count: true }),
    db.turma.groupBy({ by: ['plantaoId'], where: { status: 'agendada', data: { gte: hj } }, _count: true }),
  ]);
  const futuras = (id: string) => (aulas.find((a) => a.instrutorId === id)?._count ?? 0) + (plantoes.find((p) => p.plantaoId === id)?._count ?? 0);
  const linhas: Linha[] = usuarios
    .map((u) => ({
      id: u.id, nome: u.nome, email: u.email, cargo: u.cargo === 'gestor' ? 'gestor' as const : 'instrutor' as const, ativo: u.ativo,
      acesso: u.ultimoAcesso ? fmtAcesso(u.ultimoAcesso) : null, eu: u.id === eu.id, futuras: futuras(u.id),
    }))
    .sort((a, b) => Number(b.eu) - Number(a.eu) || Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt'));

  return (
    <div className="us">
      <UsuariosTabela
        linhas={linhas}
        filtro={{ q: sp.q ?? '', cargo: sp.cargo === 'gestor' || sp.cargo === 'instrutor' ? sp.cargo : '', sit: sp.sit === 'ativo' || sp.sit === 'off' ? sp.sit : '' }}
      />
      <section className="tcard perm" aria-labelledby="p-h">
        <div className="tbar"><div><h2 id="p-h">O que cada cargo pode fazer</h2><p className="t-sub">Vale para todos os usuários do cargo. Só o gestor troca o cargo de alguém.</p></div></div>
        <div className="tframe">
          <table>
            <thead><tr><th scope="col">Permissão</th><th scope="col" className="c">Gestor</th><th scope="col" className="c">Instrutor</th></tr></thead>
            <tbody>
              {PERM.map((r) => r.length === 1
                ? <tr key={r[0]} className="grp"><td colSpan={3}>{r[0]}</td></tr>
                : (
                  <tr key={r[0]}>
                    <td><span>{r[0]}</span>{r[3] && <span className="sub-s">{r[3]}</span>}</td>
                    <td className="c"><Bool v={r[1]} /></td>
                    <td className="c"><Bool v={r[2]} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <Toaster />
    </div>
  );
}
