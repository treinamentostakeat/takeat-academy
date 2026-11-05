import assert from 'node:assert/strict';
import { test } from 'node:test';

/* Precisa de um Postgres local vazio: TEST_DATABASE_URL=postgresql://...@localhost:.../academy
   Sem essa variável o teste é pulado. Nunca roda fora de localhost, porque apaga os dados que usa. */
const url = process.env.TEST_DATABASE_URL ?? '';
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

test('garantirTurmas com várias páginas abrindo ao mesmo tempo', { skip: local ? false : 'defina TEST_DATABASE_URL local' }, async (t) => {
  process.env.DATABASE_URL = url;
  const { db } = await import('./db');
  const { garantirTurmas } = await import('./turmas');
  const SEMANA = { de: '2030-01-07', ate: '2030-01-11' };

  t.before(async () => {
    await db.inscricao.deleteMany();
    await db.turma.deleteMany();
    await db.gradeSlot.deleteMany();
    const u = await db.usuario.upsert({ where: { email: 'teste-turmas@exemplo.takeat.app' }, update: {}, create: { email: 'teste-turmas@exemplo.takeat.app', nome: 'Teste', senhaHash: 'x' } });
    await db.gradeSlot.createMany({
      data: [1, 2, 3, 4, 5].flatMap((diaSemana) => [9, 11].map((hora) => ({ diaSemana, hora, tema: 'Delivery', instrutorId: u.id, plantaoId: u.id, valeDesde: '2030-01-01' }))),
    });
  });
  t.after(() => db.$disconnect());

  await t.test('não falha e cria cada turma uma vez', async () => {
    await Promise.all(Array.from({ length: 8 }, () => garantirTurmas(SEMANA.de, SEMANA.ate)));
    assert.equal(await db.turma.count({ where: { data: { gte: SEMANA.de, lte: SEMANA.ate } } }), 10);
  });

  await t.test('não altera turma que já existe', async () => {
    const turma = await db.turma.findFirstOrThrow({ where: { data: SEMANA.de, hora: 9 } });
    await db.turma.update({ where: { id: turma.id }, data: { tema: 'Financeiro' } });
    await garantirTurmas(SEMANA.de, SEMANA.ate);
    assert.equal((await db.turma.findUniqueOrThrow({ where: { id: turma.id } })).tema, 'Financeiro');
  });
});
