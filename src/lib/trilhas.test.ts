import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mesDe, nomeDoMes, ordenarTurma } from './trilhas';

test('turma do mês segue o horário de Brasília', () => {
  // 31/10 às 22h em Brasília = 01/11 01h UTC: ainda é turma de outubro
  assert.equal(mesDe(new Date('2026-11-01T01:00:00Z')), '2026-10');
  assert.equal(nomeDoMes(new Date('2026-11-01T01:00:00Z')), 'outubro');
  assert.equal(mesDe(new Date('2026-11-01T03:00:00Z')), '2026-11');
  assert.equal(nomeDoMes(new Date('2026-12-16T12:00:00Z')), 'dezembro');
});

test('turma ordenada por progresso, empate em ordem alfabética', () => {
  const l = ordenarTurma([{ nome: 'Bruna', pct: 10 }, { nome: 'Ana', pct: 10 }, { nome: 'Carlos', pct: 80 }, { nome: 'Você', pct: 0 }]);
  assert.deepEqual(l.map((p) => p.nome), ['Carlos', 'Ana', 'Bruna', 'Você']);
});
