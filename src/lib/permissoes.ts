/* Quem pode o quê. Regras puras, sem banco nem Next, para valerem igual em páginas, ações e testes.
   Equipe (gestor, instrutor): agenda, sala e dados de clientes. RH e colaborador: só a área interna. */

export const CARGOS = ['gestor', 'instrutor', 'rh', 'colaborador'] as const;
export type Cargo = (typeof CARGOS)[number];
export const CARGOS_EQUIPE: Cargo[] = ['gestor', 'instrutor'];

export const ROTULO_CARGO: Record<Cargo, string> = { gestor: 'Gestor', instrutor: 'Instrutor', rh: 'RH', colaborador: 'Colaborador' };
export const DESCRICAO_CARGO: Record<Cargo, string> = {
  gestor: 'Tudo do instrutor, mais trocar instrutor, cancelar turma, grade modelo e usuários.',
  instrutor: 'Vê a agenda e o detalhe das turmas, abre a sala e dá aula e plantão.',
  rh: 'Cria e gerencia o acesso dos colaboradores. Não vê a área da equipe.',
  colaborador: 'Faz a trilha de onboarding. Não vê a área da equipe.',
};

export const ehCargo = (c: unknown): c is Cargo => typeof c === 'string' && (CARGOS as readonly string[]).includes(c);
/** Valor desconhecido no banco vale como o cargo de menor acesso */
export const cargoValido = (c: unknown): Cargo => (ehCargo(c) ? c : 'colaborador');

export const ehEquipe = (c: Cargo) => CARGOS_EQUIPE.includes(c);
export const podeGerirPessoas = (c: Cargo) => c === 'gestor' || c === 'rh';
/** Criar e editar trilhas, cursos, vídeos e perguntas da área interna */
export const podeEditarConteudo = (c: Cargo) => c === 'gestor' || c === 'rh';
/** O gestor administra qualquer cargo; o RH, só colaboradores */
export const podeAdministrar = (quem: Cargo, alvo: Cargo) => quem === 'gestor' || (quem === 'rh' && alvo === 'colaborador');
export const cargosQuePodeDar = (quem: Cargo) => CARGOS.filter((c) => podeAdministrar(quem, c));

/** Clonagem de voz: só gestores cujo e-mail está na lista VOZ_ACESSO_EMAILS (separada por vírgula) */
export function podeClonarVoz(u: { cargo: Cargo; email: string }, lista: string | undefined) {
  if (u.cargo !== 'gestor' && u.cargo !== 'rh') return false;
  const emails = (lista ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return emails.includes(u.email.trim().toLowerCase());
}

export const inicioDe =(c: Cargo) => (ehEquipe(c) ? '/equipe/agenda' : '/interno');
export const loginDe = (c: Cargo) => (ehEquipe(c) ? '/equipe/entrar' : '/interno/entrar');

/* Tentativas de login: depois de 5 erros seguidos, a conta fica bloqueada por 15 minutos */
export const MAX_FALHAS_LOGIN = 5;
export const MIN_BLOQUEIO_LOGIN = 15;
export function aposFalhaDeLogin(falhas: number, agora: Date) {
  const total = falhas + 1;
  return total >= MAX_FALHAS_LOGIN
    ? { falhasLogin: 0, bloqueadoAte: new Date(agora.getTime() + MIN_BLOQUEIO_LOGIN * 60_000) }
    : { falhasLogin: total, bloqueadoAte: null };
}
