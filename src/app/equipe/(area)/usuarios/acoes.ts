'use server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { refresh } from 'next/cache';
import { headers } from 'next/headers';
import { numeroWhatsApp } from '@/lib/acesso-whatsapp';
import { enderecoBase, enviarPrimeiroAcesso, type StatusEnvio } from '@/lib/envio-acesso';
import { db } from '@/lib/db';
import { CARGOS, ROTULO_CARGO, cargoValido, podeAdministrar } from '@/lib/permissoes';
import { senhaProvisoria } from '@/lib/senha';
import { exigirGestaoPessoas } from '@/lib/sessao';

/* Ações sobre contas, usadas pelo gestor (Usuários e cargos) e pelo RH (Pessoas).
   Toda ação confere no servidor se quem chama pode administrar o cargo envolvido. */

export type ResultadoUsuario = { ok: true; msg: string; senha?: string; email?: string } | { ok: false; erro: string; campo?: 'nome' | 'email' | 'departamento' };


const Cargo = z.enum(CARGOS);
const NovoSchema = z.object({
  nome: z.string().trim().min(3, 'Informe nome e sobrenome.').max(80),
  email: z.email('Informe um e-mail válido.').trim().toLowerCase(),
  cargo: Cargo,
  departamento: z.string().trim().max(60, 'Use até 60 caracteres.').optional(),
});

export async function criarUsuario(dados: z.input<typeof NovoSchema>): Promise<ResultadoUsuario> {
  const eu = await exigirGestaoPessoas();
  const p = NovoSchema.safeParse({ ...dados, email: String(dados.email || '').trim().toLowerCase() });
  if (!p.success) {
    const i = p.error.issues[0];
    const campo = i.path[0];
    return { ok: false, erro: i.message, campo: campo === 'nome' || campo === 'departamento' ? campo : 'email' };
  }
  if (!podeAdministrar(eu.cargo, p.data.cargo)) return { ok: false, erro: 'Você não pode criar uma conta com esse cargo.' };
  if (await db.usuario.findUnique({ where: { email: p.data.email } })) return { ok: false, erro: 'Este e-mail já tem uma conta.', campo: 'email' };
  const senha = senhaProvisoria();
  await db.usuario.create({ data: { nome: p.data.nome, email: p.data.email, cargo: p.data.cargo, departamento: p.data.departamento || null, trocarSenha: true, senhaHash: await bcrypt.hash(senha, 10) } });
  refresh();
  return { ok: true, msg: `${p.data.nome} foi adicionado.`, senha, email: p.data.email };
}

/** Ações sobre outra pessoa: nunca sobre si mesmo, e só sobre cargos que quem chama pode administrar. */
async function alvo(id: string) {
  const eu = await exigirGestaoPessoas();
  if (id === eu.id) return { erro: 'Você não pode mudar a própria conta por aqui.' } as const;
  const u = await db.usuario.findUnique({ where: { id } });
  if (!u) return { erro: 'Usuário não encontrado.' } as const;
  if (!podeAdministrar(eu.cargo, cargoValido(u.cargo))) return { erro: 'Você não pode alterar esta conta.' } as const;
  return { u, eu } as const;
}
const ultimoGestor = async (id: string) =>
  (await db.usuario.count({ where: { cargo: 'gestor', ativo: true, id: { not: id } } })) === 0;

export async function trocarCargo(id: string, cargo: string): Promise<ResultadoUsuario> {
  const a = await alvo(id);
  if ('erro' in a) return { ok: false, erro: a.erro! };
  const c = Cargo.safeParse(cargo);
  if (!c.success) return { ok: false, erro: 'Cargo inválido.' };
  if (!podeAdministrar(a.eu.cargo, c.data)) return { ok: false, erro: 'Você não pode dar esse cargo.' };
  if (a.u.cargo === c.data) return { ok: true, msg: 'Nada mudou: o cargo é o mesmo.' };
  if (a.u.cargo === 'gestor' && a.u.ativo && (await ultimoGestor(id))) return { ok: false, erro: 'A equipe precisa de pelo menos um gestor ativo.' };
  await db.usuario.update({ where: { id }, data: { cargo: c.data } });
  refresh();
  return { ok: true, msg: `${a.u.nome} agora é ${ROTULO_CARGO[c.data]}.` };
}

export async function gerarNovaSenha(id: string): Promise<ResultadoUsuario> {
  const a = await alvo(id);
  if ('erro' in a) return { ok: false, erro: a.erro! };
  if (!a.u.ativo) return { ok: false, erro: 'Reative a pessoa antes de gerar uma senha.' };
  const senha = senhaProvisoria();
  await db.usuario.update({ where: { id }, data: { senhaHash: await bcrypt.hash(senha, 10), trocarSenha: true, falhasLogin: 0, bloqueadoAte: null } });
  return { ok: true, msg: `Nova senha provisória gerada para ${a.u.nome}. A senha anterior deixou de valer.`, senha, email: a.u.email };
}

export async function definirAtivo(id: string, ativo: boolean): Promise<ResultadoUsuario> {
  const a = await alvo(id);
  if ('erro' in a) return { ok: false, erro: a.erro! };
  if (a.u.ativo === ativo) return { ok: true, msg: 'Nada mudou.' };
  if (!ativo && a.u.cargo === 'gestor' && (await ultimoGestor(id))) return { ok: false, erro: 'A equipe precisa de pelo menos um gestor ativo.' };
  await db.usuario.update({ where: { id }, data: { ativo } });
  refresh();
  return { ok: true, msg: ativo ? `${a.u.nome} pode acessar de novo.` : `${a.u.nome} foi desativado. O histórico foi mantido.` };
}

/* ---------- Importar lista: cria o acesso e manda o link de primeiro acesso pelo WhatsApp ---------- */

export type ResultadoImportacao = {
  /** criado: conta nova · reenviado: já tinha conta e ainda não tinha entrado (o link foi mandado de novo) ·
      ja_tem_acesso: já criou a senha (nada muda) · erro: não deu para criar */
  situacao: 'criado' | 'reenviado' | 'ja_tem_acesso' | 'erro';
  envio?: StatusEnvio;
  /** Link de primeiro acesso, para mandar à mão quando o WhatsApp automático não sair */
  link?: string;
  erro?: string;
};

const PessoaSchema = z.object({
  nome: z.string().trim().min(3, 'Falta o nome.').max(80),
  email: z.email('E-mail inválido.').trim().toLowerCase(),
  whatsapp: z.string().trim().max(30).refine((v) => !!numeroWhatsApp(v), 'WhatsApp inválido.'),
  departamento: z.string().trim().max(60).optional(),
});

/** Endereço público da Academy, para montar o link (APP_URL ou o endereço da própria requisição) */
async function origem() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'takeat-academy.vercel.app';
  return enderecoBase(`${h.get('x-forwarded-proto') ?? 'https'}://${host}`);
}

/** Uma pessoa da lista: cria a conta de colaborador (ou aproveita a que ainda não foi usada) e manda o acesso. */
export async function importarPessoa(dados: z.input<typeof PessoaSchema>): Promise<ResultadoImportacao> {
  const eu = await exigirGestaoPessoas();
  if (!podeAdministrar(eu.cargo, 'colaborador')) return { situacao: 'erro', erro: 'Você não pode criar contas.' };
  const p = PessoaSchema.safeParse({ ...dados, email: String(dados.email || '').trim().toLowerCase() });
  if (!p.success) return { situacao: 'erro', erro: p.error.issues[0].message };
  const base = await origem();

  const existente = await db.usuario.findUnique({ where: { email: p.data.email }, select: { id: true, nome: true, email: true, cargo: true, ativo: true, trocarSenha: true, senhaHash: true } });
  if (existente) {
    if (!existente.ativo) return { situacao: 'erro', erro: 'Conta desativada: reative na lista antes.' };
    // Já criou a própria senha (ou é da equipe/RH): já tem acesso, não mexe
    if (!existente.trocarSenha || existente.cargo !== 'colaborador') return { situacao: 'ja_tem_acesso' };
    const envio = await enviarPrimeiroAcesso(existente, p.data.whatsapp, base);
    return { situacao: 'reenviado', envio: envio.status, link: envio.link };
  }

  try {
    const u = await db.usuario.create({
      data: { nome: p.data.nome, email: p.data.email, cargo: 'colaborador', departamento: p.data.departamento || null, trocarSenha: true, senhaHash: await bcrypt.hash(senhaProvisoria(), 10) },
      select: { id: true, nome: true, email: true, senhaHash: true },
    });
    const envio = await enviarPrimeiroAcesso(u, p.data.whatsapp, base);
    return { situacao: 'criado', envio: envio.status, link: envio.link };
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return { situacao: 'ja_tem_acesso' };
    return { situacao: 'erro', erro: 'Não foi possível criar a conta. Tente de novo.' };
  }
}

/** Atualiza a lista depois da importação */
export async function terminarImportacao() {
  await exigirGestaoPessoas();
  refresh();
}
