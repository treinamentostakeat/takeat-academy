'use server';
/* Ações do cliente: inscrever-se numa turma, identificar o restaurante, trocar de restaurante e cancelar inscrição.
   O cliente não tem senha: o restaurante é identificado pelo CNPJ e lembrado num cookie assinado (sessao.ts). */
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from './db';
import { agora, situacao } from './datas';
import { cnpjValido, soNumeros } from './formato';
import { clienteAtual, esquecerCliente, identificarCliente } from './sessao';
import { FIM_AGENDA } from './turmas';
import { hubspotInscricao } from './integracoes/hubspot';
import { whatsInscricao } from './integracoes/whatsapp';
import { CANAIS, diaMinusculo, quandoTexto, type EntradaInscricao, type ResultadoIdentificar, type ResultadoInscricao } from '@/components/cliente/comum';

const APP_URL = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

const Entrada = z.object({
  turmaId: z.string().min(1).max(64),
  nome: z.string().trim().min(2, 'Digite seu nome.').max(80, 'Use até 80 caracteres.'),
  whatsapp: z.string().transform(soNumeros).refine((v) => v.length === 10 || v.length === 11, 'Digite um WhatsApp com DDD.'),
  canal: z.enum(CANAIS).catch('avulso'),
  cnpj: z.string().transform(soNumeros).optional(),
  restaurante: z.string().trim().max(120).optional(),
});

/** Código curto e único do link pessoal da sala (/s/[codigo]) */
async function novoCodigo() {
  for (let i = 0; i < 8; i++) {
    const c = randomBytes(6).toString('base64url'); // 8 caracteres
    if (!(await db.inscricao.findUnique({ where: { codigo: c }, select: { id: true } }))) return c;
  }
  throw new Error('Não foi possível gerar o código da inscrição');
}

/** Acha o restaurante pelo CNPJ; cria se ainda não existe (aí o nome é obrigatório) */
async function restaurantePorCnpj(cnpj: string, nome?: string) {
  const r = await db.restaurante.findUnique({ where: { cnpj } });
  if (r) return { ok: true as const, r };
  if (!nome || nome.length < 2) return { ok: false as const };
  return { ok: true as const, r: await db.restaurante.create({ data: { cnpj, nome } }) };
}

export async function inscrever(entrada: EntradaInscricao): Promise<ResultadoInscricao> {
  const p = Entrada.safeParse(entrada);
  if (!p.success) {
    const i = p.error.issues[0];
    const campo = i.path[0];
    return { ok: false, erro: i.message || 'Confira os dados.', campo: campo === 'nome' || campo === 'whatsapp' ? campo : undefined };
  }
  const d = p.data;
  const cliente = await clienteAtual();

  // Turma: só futura (ou ao vivo agora) e não cancelada
  const turma = await db.turma.findUnique({ where: { id: d.turmaId } });
  if (!turma || turma.data > FIM_AGENDA) return { ok: false, erro: 'Essa aula não existe mais. Escolha outro horário.', campo: 'turma' };
  const sit = situacao(turma);
  if (sit === 'cancelada') return { ok: false, erro: 'Essa aula foi cancelada. Escolha outro horário.', campo: 'turma' };
  if (sit === 'realizada') return { ok: false, erro: 'Essa aula já aconteceu. Escolha outro horário.', campo: 'turma' };

  // Mesma pessoa (WhatsApp) não se inscreve duas vezes na mesma turma
  const dup = await db.inscricao.findUnique({ where: { turmaId_whatsapp: { turmaId: turma.id, whatsapp: d.whatsapp } }, select: { id: true } });
  if (dup) return { ok: false, erro: 'Esse WhatsApp já está inscrito nessa aula. Veja suas aulas no perfil do restaurante.', campo: 'whatsapp' };

  // Restaurante: CNPJ informado (ou vindo do link) ou o já identificado no aparelho. Só cria depois de validar tudo.
  let restaurante;
  if (d.cnpj) {
    if (!cnpjValido(d.cnpj)) return { ok: false, erro: 'Esse CNPJ não é válido. Confira os números.', campo: 'cnpj' };
    const r = await restaurantePorCnpj(d.cnpj, d.restaurante);
    if (!r.ok) return { ok: false, erro: 'Digite o nome do restaurante.', campo: 'restaurante' };
    restaurante = r.r;
  } else if (cliente) {
    restaurante = await db.restaurante.findUnique({ where: { id: cliente.restauranteId } });
  }
  if (!restaurante) return { ok: false, erro: 'Digite o CNPJ do restaurante.', campo: 'cnpj' };

  // Canal: o da URL; se a pessoa chegou por /i/[cnpj] e navegou pelo menu, vale o cookie de origem
  const origem = (await cookies()).get('academy_canal')?.value;
  const canal = d.canal !== 'avulso' ? d.canal : origem === 'grupo' || origem === 'botao' ? origem : 'avulso';

  let codigo: string;
  try {
    codigo = await novoCodigo();
    await db.inscricao.create({
      data: { turmaId: turma.id, restauranteId: restaurante.id, nome: d.nome, whatsapp: d.whatsapp, canal, codigo },
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return { ok: false, erro: 'Esse WhatsApp já está inscrito nessa aula.', campo: 'whatsapp' };
    throw e;
  }

  await identificarCliente({ restauranteId: restaurante.id, cnpj: restaurante.cnpj, nome: restaurante.nome, pessoa: d.nome, whatsapp: d.whatsapp });

  // Avisos externos: falha nunca desfaz a inscrição
  const quando = quandoTexto(turma.data, turma.hora);
  await Promise.allSettled([
    whatsInscricao(d.whatsapp, d.nome, turma.tema, quando, `${APP_URL()}/s/${codigo}`),
    hubspotInscricao({ cnpj: restaurante.cnpj, restaurante: restaurante.nome, pessoa: d.nome, tema: turma.tema, quando }),
  ]);

  return { ok: true, codigo, mensagem: `Inscrição confirmada: ${turma.tema}, ${diaMinusculo(turma.data, agora().data)}, às ${turma.hora}h.` };
}

/** Perfil: identifica o restaurante pelo CNPJ (cria se for novo, com o nome) */
export async function identificar(_prev: ResultadoIdentificar, form: FormData): Promise<ResultadoIdentificar> {
  const cnpj = soNumeros(String(form.get('cnpj') || ''));
  const nome = String(form.get('restaurante') || '').trim().slice(0, 120);
  if (cnpj.length !== 14) return { ok: false, erro: 'Digite os 14 números do CNPJ.', campo: 'cnpj', precisaNome: !!form.get('restaurante') };
  if (!cnpjValido(cnpj)) return { ok: false, erro: 'Esse CNPJ não é válido. Confira os números.', campo: 'cnpj', precisaNome: !!form.get('restaurante') };
  const r = await restaurantePorCnpj(cnpj, nome);
  if (!r.ok) {
    return form.has('restaurante')
      ? { ok: false, erro: 'Digite o nome do restaurante.', campo: 'restaurante', precisaNome: true }
      : { ok: false, precisaNome: true };
  }
  const atual = await clienteAtual();
  const mesma = atual?.restauranteId === r.r.id;
  await identificarCliente({ restauranteId: r.r.id, cnpj: r.r.cnpj, nome: r.r.nome, pessoa: mesma ? atual?.pessoa : undefined, whatsapp: mesma ? atual?.whatsapp : undefined });
  return { ok: true };
}

/** Perfil: esquece o restaurante deste aparelho */
export async function trocarRestaurante() {
  await esquecerCliente();
  redirect('/perfil');
}

/** Perfil: cancela uma inscrição do restaurante identificado (só antes da aula começar) */
export async function cancelarInscricao(id: string): Promise<{ ok: boolean; mensagem: string }> {
  const cliente = await clienteAtual();
  if (!cliente || typeof id !== 'string') return { ok: false, mensagem: 'Identifique o restaurante para cancelar.' };
  const i = await db.inscricao.findUnique({ where: { id }, include: { turma: true } });
  if (!i || i.restauranteId !== cliente.restauranteId) return { ok: false, mensagem: 'Inscrição não encontrada.' };
  if (situacao(i.turma) !== 'agendada') return { ok: false, mensagem: 'Essa aula já começou ou foi cancelada.' };
  await db.inscricao.delete({ where: { id } });
  return { ok: true, mensagem: `Inscrição cancelada: ${i.turma.tema}, ${diaMinusculo(i.turma.data, agora().data)}, às ${i.turma.hora}h.` };
}
