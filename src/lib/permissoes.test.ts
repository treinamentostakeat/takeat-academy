import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aposFalhaDeLogin, cargoValido, cargosQuePodeDar, ehEquipe, inicioDe, loginDe, podeAdministrar, podeEditarConteudo, podeGerirPessoas } from './permissoes';

test('só gestor e instrutor são da equipe', () => {
  assert.equal(ehEquipe('gestor'), true);
  assert.equal(ehEquipe('instrutor'), true);
  assert.equal(ehEquipe('rh'), false);
  assert.equal(ehEquipe('colaborador'), false);
});

test('cargo desconhecido não ganha acesso', () => {
  assert.equal(cargoValido('admin'), 'colaborador');
  assert.equal(cargoValido(undefined), 'colaborador');
  assert.equal(cargoValido('rh'), 'rh');
});

test('só gestor e RH gerem pessoas', () => {
  assert.equal(podeGerirPessoas('gestor'), true);
  assert.equal(podeGerirPessoas('rh'), true);
  assert.equal(podeGerirPessoas('instrutor'), false);
  assert.equal(podeGerirPessoas('colaborador'), false);
});

test('só gestor e RH editam conteúdo', () => {
  assert.equal(podeEditarConteudo('gestor'), true);
  assert.equal(podeEditarConteudo('rh'), true);
  assert.equal(podeEditarConteudo('instrutor'), false);
  assert.equal(podeEditarConteudo('colaborador'), false);
});

test('RH só administra colaboradores', () => {
  assert.equal(podeAdministrar('rh', 'colaborador'), true);
  for (const alvo of ['gestor', 'instrutor', 'rh'] as const) assert.equal(podeAdministrar('rh', alvo), false, alvo);
  assert.deepEqual(cargosQuePodeDar('rh'), ['colaborador']);
});

test('gestor administra todos; instrutor e colaborador, ninguém', () => {
  assert.deepEqual(cargosQuePodeDar('gestor'), ['gestor', 'instrutor', 'rh', 'colaborador']);
  assert.deepEqual(cargosQuePodeDar('instrutor'), []);
  assert.deepEqual(cargosQuePodeDar('colaborador'), []);
});

test('cada cargo cai na sua área', () => {
  assert.equal(inicioDe('gestor'), '/equipe/agenda');
  assert.equal(inicioDe('colaborador'), '/interno');
  assert.equal(inicioDe('rh'), '/interno');
  assert.equal(loginDe('instrutor'), '/equipe/entrar');
  assert.equal(loginDe('colaborador'), '/interno/entrar');
});

test('login bloqueia na quinta falha seguida', () => {
  const agora = new Date('2026-11-05T12:00:00Z');
  assert.deepEqual(aposFalhaDeLogin(0, agora), { falhasLogin: 1, bloqueadoAte: null });
  assert.deepEqual(aposFalhaDeLogin(3, agora), { falhasLogin: 4, bloqueadoAte: null });
  assert.deepEqual(aposFalhaDeLogin(4, agora), { falhasLogin: 0, bloqueadoAte: new Date('2026-11-05T12:15:00Z') });
});
