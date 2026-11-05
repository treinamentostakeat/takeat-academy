import assert from 'node:assert/strict';
import { test } from 'node:test';
import { abrir, selar } from './selo';

const SEGREDO = 'segredo-de-teste-com-tamanho-suficiente';
process.env.SESSION_SECRET = SEGREDO;

test('cookie assinado', async (t) => {
  const token = selar({ id: 'u1', cargo: 'gestor' });

  await t.test('abre o conteúdo original', () => {
    assert.deepEqual(abrir(token), { id: 'u1', cargo: 'gestor' });
  });

  await t.test('recusa conteúdo adulterado', () => {
    const [, assinatura] = token.split('.');
    const falso = Buffer.from(JSON.stringify({ id: 'outro', cargo: 'gestor' })).toString('base64url');
    assert.equal(abrir(`${falso}.${assinatura}`), null);
  });

  await t.test('recusa assinatura adulterada ou ausente', () => {
    const [conteudo] = token.split('.');
    assert.equal(abrir(`${conteudo}.errada`), null);
    assert.equal(abrir(conteudo), null);
    assert.equal(abrir(undefined), null);
  });

  await t.test('recusa token de outro segredo', () => {
    process.env.SESSION_SECRET = 'outro-segredo-com-tamanho-suficiente';
    try {
      assert.equal(abrir(token), null);
    } finally {
      process.env.SESSION_SECRET = SEGREDO;
    }
  });

  await t.test('recusa segredo ausente ou curto', () => {
    process.env.SESSION_SECRET = 'curto';
    try {
      assert.throws(() => selar({ id: 'u1' }), /SESSION_SECRET/);
    } finally {
      process.env.SESSION_SECRET = SEGREDO;
    }
  });
});
