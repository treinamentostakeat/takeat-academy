import assert from 'node:assert/strict';
import { test } from 'node:test';
import { caminhoDoVideo, ehCaminhoDoCurso } from './armazenamento';

test('caminho do vídeo fica dentro da pasta do curso e sem caracteres estranhos', () => {
  assert.equal(caminhoDoVideo('c1', 'Parte 1 · Calendário e processos.MP4', 'ab12'), 'cursos/c1/ab12-Parte-1-Calendario-e-processos.mp4');
  assert.equal(caminhoDoVideo('c1', '../../etc/passwd', 'ab12'), 'cursos/c1/ab12-etc-passwd.mp4');
  assert.equal(caminhoDoVideo('c1', 'aula.webm', 'x'), 'cursos/c1/x-aula.webm');
});

test('só aceita arquivo da pasta do próprio curso', () => {
  assert.equal(ehCaminhoDoCurso('c1', 'cursos/c1/ab12-aula.mp4'), true);
  assert.equal(ehCaminhoDoCurso('c1', 'cursos/c2/ab12-aula.mp4'), false);
  assert.equal(ehCaminhoDoCurso('c1', 'cursos/c1/../c2/aula.mp4'), false);
  assert.equal(ehCaminhoDoCurso('c1', 'cursos/c1/aula.exe'), false);
});
