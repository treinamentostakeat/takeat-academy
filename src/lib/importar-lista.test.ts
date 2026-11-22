import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lerLista } from './importar-lista';

test('lista colada da planilha: colunas em qualquer ordem, com cabeçalho', () => {
  const l = lerLista('Nome\tE-mail\tWhatsApp\tÁrea\nAna Souza\tAna@Takeat.app\t(27) 99876-5432\tFinanceiro\n27 99999-0000\tbeto@takeat.app\tBeto Lima');
  assert.equal(l.length, 2);
  assert.deepEqual(l[0], { linha: 2, nome: 'Ana Souza', email: 'ana@takeat.app', whatsapp: '(27) 99876-5432', departamento: 'Financeiro', erro: '' });
  assert.equal(l[1].nome, 'Beto Lima');
  assert.equal(l[1].whatsapp, '27 99999-0000');
  assert.equal(l[1].erro, '');
});

test('lista em CSV com ponto e vírgula; erros por linha', () => {
  const l = lerLista('Ana Souza;ana@takeat;27998765432\nBeto Lima;beto@takeat.app;123\nCarla Dias;carla@takeat.app\nAna Clara;carla@takeat.app;27998765432');
  assert.equal(l[0].erro, 'E-mail inválido');
  assert.equal(l[1].erro, 'Falta o WhatsApp'); // "123" não parece telefone: fica como texto
  assert.equal(l[2].erro, 'Falta o WhatsApp');
  assert.equal(l[3].erro, 'E-mail repetido na lista');
});
