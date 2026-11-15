import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linkWhatsApp, mensagemDeAcesso, numeroWhatsApp } from './acesso-whatsapp';

test('número do WhatsApp: com ou sem 55, com máscara; inválido vira vazio', () => {
  assert.equal(numeroWhatsApp('(27) 99876-5432'), '5527998765432');
  assert.equal(numeroWhatsApp('2733334444'), '552733334444');
  assert.equal(numeroWhatsApp('+55 27 99876-5432'), '5527998765432');
  assert.equal(numeroWhatsApp('123'), '');
  assert.equal(numeroWhatsApp(''), '');
});

test('mensagem de acesso traz endereço, e-mail e senha, com o primeiro nome', () => {
  const m = mensagemDeAcesso({ nome: 'Ana Souza', endereco: 'https://x.app/interno/entrar', email: 'ana@x.app', senha: 'Ab12-cd34', nova: false });
  assert.match(m, /^Olá, Ana! Seu acesso/);
  assert.match(m, /Acesse: https:\/\/x\.app\/interno\/entrar/);
  assert.match(m, /E-mail: ana@x\.app/);
  assert.match(m, /Senha provisória: Ab12-cd34/);
  assert.match(mensagemDeAcesso({ nome: 'Ana', endereco: 'e', email: 'm', senha: 's', nova: true }), /nova senha provisória/);
});

test('link wa.me com o texto codificado; sem número abre a escolha de contato', () => {
  assert.equal(linkWhatsApp('27998765432', 'Olá, Ana!\nE-mail'), 'https://wa.me/5527998765432?text=Ol%C3%A1%2C%20Ana!%0AE-mail');
  assert.equal(linkWhatsApp('', 'oi'), 'https://wa.me/?text=oi');
});
