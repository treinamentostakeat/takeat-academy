import assert from 'node:assert/strict';
import { test } from 'node:test';
import { corDaEtapa, corrigir, exibicaoDeVideo, iconeDoCurso, linkValido } from './aprendizagem';

test('vídeo do YouTube, Vimeo e Drive vira player incorporado', () => {
  assert.deepEqual(exibicaoDeVideo('https://www.youtube.com/watch?v=abc123XYZ'), { tipo: 'iframe', src: 'https://www.youtube-nocookie.com/embed/abc123XYZ' });
  assert.deepEqual(exibicaoDeVideo('https://youtu.be/abc123XYZ?t=10'), { tipo: 'iframe', src: 'https://www.youtube-nocookie.com/embed/abc123XYZ' });
  assert.deepEqual(exibicaoDeVideo('https://vimeo.com/123456'), { tipo: 'iframe', src: 'https://player.vimeo.com/video/123456' });
  assert.deepEqual(exibicaoDeVideo('https://drive.google.com/file/d/1AbC_d-9/view?usp=sharing'), { tipo: 'iframe', src: 'https://drive.google.com/file/d/1AbC_d-9/preview' });
});

test('arquivo de vídeo direto usa o player do navegador', () => {
  assert.deepEqual(exibicaoDeVideo('https://cdn.exemplo.com/aula.mp4'), { tipo: 'video', src: 'https://cdn.exemplo.com/aula.mp4' });
});

test('outros sites viram link, nunca iframe', () => {
  assert.deepEqual(exibicaoDeVideo('https://site-qualquer.com/pagina'), { tipo: 'link', href: 'https://site-qualquer.com/pagina' });
  assert.deepEqual(exibicaoDeVideo('https://youtube.com.golpe.com/watch?v=abc123'), { tipo: 'link', href: 'https://youtube.com.golpe.com/watch?v=abc123' });
});

test('links que não são http(s) são recusados', () => {
  assert.equal(exibicaoDeVideo('javascript:alert(1)'), null);
  assert.equal(exibicaoDeVideo('não é link'), null);
  assert.equal(exibicaoDeVideo(''), null);
  assert.equal(linkValido('javascript:alert(1)'), false);
  assert.equal(linkValido('https://drive.google.com/x'), true);
});

test('capa escolhe o ícone pelo assunto e a cor pela etapa', () => {
  assert.equal(iconeDoCurso('Financeiro'), 'payments');
  assert.equal(iconeDoCurso('Novos Negócios de IA'), 'auto_awesome');
  assert.equal(iconeDoCurso('Sucesso do Cliente'), 'handshake');
  assert.equal(iconeDoCurso('Assunto sem ícone'), 'school');
  assert.equal(corDaEtapa(0), 'brand');
  assert.equal(corDaEtapa(6), 'brand');
  assert.equal(corDaEtapa(-1), 'yellow');
});

test('quiz aprova com o mínimo de acertos', () => {
  assert.deepEqual(corrigir([0, 1, 2, 0, 1, 2, 0, 1, 2, 0], [0, 1, 2, 0, 1, 2, 0, 0, 0, 1], 7), { acertos: 7, total: 10, minimo: 7, aprovada: true });
  assert.equal(corrigir([0, 1, 2, 0, 1, 2, 0, 1, 2, 0], [0, 1, 2, 0, 1, 2, 1, 0, 0, 1], 7).aprovada, false);
});

test('pergunta sem resposta conta como erro', () => {
  assert.deepEqual(corrigir([0, 1], [0, undefined], 2), { acertos: 1, total: 2, minimo: 2, aprovada: false });
});

test('mínimo nunca passa do total de perguntas', () => {
  assert.deepEqual(corrigir([0, 1, 2], [0, 1, 2], 7), { acertos: 3, total: 3, minimo: 3, aprovada: true });
  assert.equal(corrigir([], [], 7).aprovada, false);
});
