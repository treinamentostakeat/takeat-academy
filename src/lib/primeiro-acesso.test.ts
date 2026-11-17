import assert from 'node:assert/strict';
import { test } from 'node:test';
import { idDoToken, lerTokenDeAcesso, linkDeAcesso, tokenDeAcesso } from './primeiro-acesso';

process.env.SESSION_SECRET = 'segredo-de-teste-com-tamanho-suficiente'; // lido na hora de assinar

const conta = { id: 'u1', senhaHash: '$2a$10$hashoriginal' };
const hashDe = (h: string | null) => (id: string) => (id === 'u1' ? h : null);

test('link de primeiro acesso: vale com a mesma senha e dentro do prazo', () => {
  const tk = tokenDeAcesso(conta, 1_000);
  assert.equal(idDoToken(tk), 'u1');
  assert.equal(lerTokenDeAcesso(tk, hashDe(conta.senhaHash), 2_000), 'u1');
  assert.equal(linkDeAcesso('https://x.app/', tk), `https://x.app/acesso/${tk}`);
});

test('link de primeiro acesso: deixa de valer quando a senha muda, quando vence ou se for alterado', () => {
  const tk = tokenDeAcesso(conta, 1_000);
  assert.equal(lerTokenDeAcesso(tk, hashDe('$2a$10$outrasenha'), 2_000), null);
  assert.equal(lerTokenDeAcesso(tk, hashDe(conta.senhaHash), 1_000 + 8 * 86400e3), null);
  assert.equal(lerTokenDeAcesso(tk, hashDe(null), 2_000), null);
  assert.equal(lerTokenDeAcesso(tk.slice(0, -2) + 'xx', hashDe(conta.senhaHash), 2_000), null);
});
