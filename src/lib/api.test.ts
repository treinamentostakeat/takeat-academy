import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autorizar, hashDaChave } from './api';

const CHAVE = 'tka_chave-de-teste-com-tamanho-suficiente';
const HASH = hashDaChave(CHAVE);

test('aceita a chave certa no cabeçalho Bearer', () => {
  assert.deepEqual(autorizar(`Bearer ${CHAVE}`, HASH), { ok: true });
  assert.deepEqual(autorizar(`bearer ${CHAVE}`, HASH.toUpperCase()), { ok: true });
});

test('recusa chave errada, ausente ou mal formatada', () => {
  assert.equal(autorizar('Bearer outra-chave', HASH).ok, false);
  assert.equal(autorizar(null, HASH).ok, false);
  assert.equal(autorizar(CHAVE, HASH).ok, false);
  assert.equal(autorizar(`Basic ${CHAVE}`, HASH).ok, false);
  assert.deepEqual(autorizar('Bearer outra-chave', HASH), { ok: false, status: 401, erro: 'Chave inválida.' });
});

test('sem hash configurado, a API fica desligada para todos', () => {
  for (const h of [undefined, '', 'nao-e-hash']) {
    const r = autorizar(`Bearer ${CHAVE}`, h);
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.status, 503);
  }
});
