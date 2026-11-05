import { UsuariosTabela, type Linha } from '@/app/equipe/(area)/usuarios/UsuariosTabela';
import { Toaster } from '@/components/equipe/Toast';
import { db } from '@/lib/db';
import { cargoValido, cargosQuePodeDar, ehCargo, podeAdministrar } from '@/lib/permissoes';
import { exigirGestaoPessoas } from '@/lib/sessao';
import '@/app/equipe/(area)/usuarios/usuarios.css';

export const metadata = { title: 'Pessoas' };

const fmtAcesso = (d: Date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(d).replace(', ', ' às ');

/* RH: cria e gerencia o acesso de quem faz o onboarding. Pessoas da equipe ficam em /equipe/usuarios, só para o gestor. */
export default async function Pessoas({ searchParams }: { searchParams: Promise<{ q?: string; cargo?: string; sit?: string }> }) {
  const eu = await exigirGestaoPessoas();
  const sp = await searchParams;
  const usuarios = await db.usuario.findMany({
    where: { cargo: { in: ['colaborador', 'rh'] } },
    select: { id: true, nome: true, email: true, cargo: true, ativo: true, ultimoAcesso: true, departamento: true },
  });
  const linhas: Linha[] = usuarios
    .map((u) => {
      const cargo = cargoValido(u.cargo);
      return {
        id: u.id, nome: u.nome, email: u.email, cargo, ativo: u.ativo, departamento: u.departamento,
        acesso: u.ultimoAcesso ? fmtAcesso(u.ultimoAcesso) : null, eu: u.id === eu.id, futuras: 0,
        gerenciavel: u.id !== eu.id && podeAdministrar(eu.cargo, cargo),
      };
    })
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt'));
  // Mesmo para o gestor, esta tela só cria colaboradores e RH; os demais cargos ficam em Usuários e cargos
  const cargos = cargosQuePodeDar(eu.cargo).filter((c) => c === 'colaborador' || c === 'rh');

  return (
    <div className="us">
      <UsuariosTabela
        linhas={linhas}
        cargos={cargos}
        titulo="Pessoas"
        subtitulo="Crie o acesso de cada colaborador. A senha provisória aparece uma vez, para você repassar."
        rotuloTabela="Colaboradores"
        comDepartamento
        filtro={{ q: sp.q ?? '', cargo: ehCargo(sp.cargo) ? sp.cargo : '', sit: sp.sit === 'ativo' || sp.sit === 'off' ? sp.sit : '' }}
      />
      <Toaster />
    </div>
  );
}
