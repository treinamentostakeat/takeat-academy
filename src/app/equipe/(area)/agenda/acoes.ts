'use server';
import { z } from 'zod';
import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { CARGOS_EQUIPE } from '@/lib/permissoes';
import { exigirUsuario } from '@/lib/sessao';
import { situacao } from '@/lib/datas';
import { quandoTurma } from '@/lib/equipe';
import { whatsCancelamento } from '@/lib/integracoes/whatsapp';

export type Resultado = { ok: true; msg: string } | { ok: false; erro: string };

const TrocaSchema = z.object({ turmaId: z.string().min(1), instrutorId: z.string().min(1), plantaoId: z.string().min(1) });

/** Gestor troca quem dá a aula e quem fica no plantão numa turma (só esta turma; a grade não muda). */
export async function trocarInstrutor(dados: z.infer<typeof TrocaSchema>): Promise<Resultado> {
  await exigirUsuario({ gestor: true });
  const p = TrocaSchema.safeParse(dados);
  if (!p.success) return { ok: false, erro: 'Escolha quem dá a aula e quem fica no plantão.' };
  const t = await db.turma.findUnique({ where: { id: p.data.turmaId } });
  if (!t) return { ok: false, erro: 'Turma não encontrada.' };
  const s = situacao(t);
  if (s === 'cancelada' || s === 'realizada') return { ok: false, erro: 'Esta turma já aconteceu ou foi cancelada.' };
  const pessoas = await db.usuario.findMany({ where: { id: { in: [p.data.instrutorId, p.data.plantaoId] }, ativo: true, cargo: { in: CARGOS_EQUIPE } }, select: { id: true, nome: true } });
  const inst = pessoas.find((u) => u.id === p.data.instrutorId);
  if (!inst || !pessoas.some((u) => u.id === p.data.plantaoId)) return { ok: false, erro: 'Escolha pessoas ativas da equipe.' };
  if (t.instrutorId === p.data.instrutorId && t.plantaoId === p.data.plantaoId) return { ok: true, msg: 'Nada mudou: a escala é a mesma.' };
  await db.turma.update({ where: { id: t.id }, data: { instrutorId: p.data.instrutorId, plantaoId: p.data.plantaoId } });
  refresh();
  return { ok: true, msg: `Escala atualizada. ${inst.nome} dá esta aula.` };
}

const CancelSchema = z.object({ turmaId: z.string().min(1), motivo: z.string().trim().max(300).optional() });

/** Gestor cancela uma turma futura; cada inscrito recebe aviso automático com link para escolher outro horário. */
export async function cancelarTurma(dados: z.infer<typeof CancelSchema>): Promise<Resultado> {
  await exigirUsuario({ gestor: true });
  const p = CancelSchema.safeParse(dados);
  if (!p.success) return { ok: false, erro: 'O motivo pode ter no máximo 300 caracteres.' };
  const t = await db.turma.findUnique({ where: { id: p.data.turmaId }, include: { inscricoes: { select: { nome: true, whatsapp: true } } } });
  if (!t) return { ok: false, erro: 'Turma não encontrada.' };
  const s = situacao(t);
  if (s === 'cancelada') return { ok: false, erro: 'Esta turma já foi cancelada.' };
  if (s !== 'agendada') return { ok: false, erro: 'Turma que já começou ou já aconteceu não pode ser cancelada.' };

  await db.turma.update({ where: { id: t.id }, data: { status: 'cancelada', canceladaEm: new Date(), motivoCancel: p.data.motivo || null } });

  const link = `${process.env.APP_URL || 'http://localhost:3000'}/aulas?cancelada=1`;
  const quando = quandoTurma(t.data, t.hora);
  let avisados = 0;
  for (const i of t.inscricoes) {
    try {
      await whatsCancelamento(i.whatsapp, i.nome, t.tema, quando, link);
      avisados++;
    } catch {
      /* falha de integração nunca desfaz o cancelamento */
    }
  }
  refresh();
  const n = t.inscricoes.length;
  if (!n) return { ok: true, msg: 'Turma cancelada.' };
  if (avisados === n) return { ok: true, msg: `Turma cancelada. ${n === 1 ? 'O inscrito foi avisado' : `Os ${n} inscritos foram avisados`} pelo WhatsApp.` };
  return { ok: true, msg: `Turma cancelada. ${avisados} de ${n} inscritos foram avisados; confira os demais na lista.` };
}
