import assert from 'node:assert/strict';
import { test } from 'node:test';
import { XP, calcular, comandaDa, missoesDaSemana, nivelDe, semanaDe, type Evento } from './gamificacao-regras';

process.env.TZ_AULAS = 'America/Sao_Paulo';
const d = (s: string) => new Date(s); // horários em UTC; Brasília = UTC-3

test('níveis de cozinha: limites e quanto falta', () => {
  assert.equal(nivelDe(0).nome, 'Ajudante');
  assert.equal(nivelDe(299).nome, 'Ajudante');
  assert.equal(nivelDe(300).nome, 'Cozinheiro');
  assert.equal(nivelDe(550).pct, 50);
  assert.equal(nivelDe(550).prox?.falta, 250);
  assert.equal(nivelDe(9999).nome, 'Chef Executivo');
  assert.equal(nivelDe(9999).prox, null);
});

test('semana começa na segunda, no horário de Brasília', () => {
  assert.equal(semanaDe(d('2026-11-16T12:00:00Z')), '2026-11-16'); // segunda
  assert.equal(semanaDe(d('2026-11-22T20:00:00Z')), '2026-11-16'); // domingo 17h em Brasília
  assert.equal(semanaDe(d('2026-11-23T02:00:00Z')), '2026-11-16'); // domingo 23h em Brasília (já é segunda em UTC)
});

test('comanda: três missões, uma de cada tipo, iguais para todos na mesma semana', () => {
  const m = missoesDaSemana('2026-11-16');
  assert.equal(m.length, 3);
  assert.deepEqual(missoesDaSemana('2026-11-16').map((x) => x.id), m.map((x) => x.id));
  assert.ok(m[0].id.startsWith('curso') && m[1].id.match(/quiz|gabarito/) && m[2].id.startsWith('video'));
  // Tudo feito: comanda fechada
  const ev: Evento[] = [
    { tipo: 'curso', em: d('2026-11-17T12:00:00Z'), cursoId: 'a', acertos: 10, total: 10 },
    { tipo: 'curso', em: d('2026-11-17T12:00:00Z'), cursoId: 'b', acertos: 8, total: 10 },
    ...['a', 'b', 'c'].map((c) => ({ tipo: 'quiz' as const, em: d('2026-11-17T12:00:00Z'), cursoId: c, acertos: 10, total: 10, aprovada: true })),
    { tipo: 'video', em: d('2026-11-17T12:00:00Z'), cursoId: 'a' }, { tipo: 'video', em: d('2026-11-17T12:00:00Z'), cursoId: 'b' },
  ];
  assert.equal(comandaDa('2026-11-16', ev).fechada, true);
  assert.equal(comandaDa('2026-11-16', []).fechada, false);
});

test('XP: curso, gabarito, nota alta, aprovado de primeira e comanda', () => {
  const agora = d('2026-11-18T12:00:00Z');
  const ev: Evento[] = [
    { tipo: 'curso', em: d('2026-11-17T12:00:00Z'), cursoId: 'a', acertos: 10, total: 10 }, // gabarito
    { tipo: 'curso', em: d('2026-11-17T13:00:00Z'), cursoId: 'b', acertos: 9, total: 10 },  // nota alta
    { tipo: 'quiz', em: d('2026-11-17T11:00:00Z'), cursoId: 'a', acertos: 10, total: 10, aprovada: true },
    { tipo: 'quiz', em: d('2026-11-17T12:30:00Z'), cursoId: 'b', acertos: 5, total: 10, aprovada: false },
    { tipo: 'quiz', em: d('2026-11-17T12:50:00Z'), cursoId: 'b', acertos: 9, total: 10, aprovada: true },
  ];
  const j = calcular(ev, { passaporteCompleto: false, formaturas: 0 }, agora);
  const semComanda = 2 * XP.cursoConcluido + XP.gabarito + XP.notaAlta + XP.dePrimeira;
  assert.equal(j.xp - (j.resumo.comandas * XP.comandaFechada), semComanda);
  assert.equal(j.resumo.gabaritos, 1);
  assert.equal(j.resumo.dePrimeira, 1);
  assert.equal(j.conquistas.find((c) => c.id === 'primeiro-curso')?.ok, true);
  assert.equal(j.conquistas.find((c) => c.id === 'formatura')?.ok, false);
});

test('streak: semanas seguidas; a semana atual sem atividade ainda não quebra a sequência', () => {
  const ev = (iso: string): Evento => ({ tipo: 'video', em: d(iso), cursoId: 'x' });
  const eventos = [ev('2026-11-03T12:00:00Z'), ev('2026-11-10T12:00:00Z')]; // semanas de 02/11 e 09/11
  assert.equal(calcular(eventos, { passaporteCompleto: false, formaturas: 0 }, d('2026-11-17T12:00:00Z')).resumo.streak, 2);
  assert.equal(calcular(eventos, { passaporteCompleto: false, formaturas: 0 }, d('2026-11-25T12:00:00Z')).resumo.streak, 0);
  assert.equal(calcular(eventos, { passaporteCompleto: false, formaturas: 0 }, d('2026-11-25T12:00:00Z')).resumo.maiorStreak, 2);
});
