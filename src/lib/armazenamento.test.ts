import assert from 'node:assert/strict';
import { test } from 'node:test';
import { caminhoDaCapa, caminhoDoVideo, ehCaminhoDoCurso, ehCapaDaPasta, hostDoStorage, limiteVideoMb, pastaDaCapa } from './armazenamento';

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

test('envio grande usa o host direto do Storage', () => {
  assert.equal(hostDoStorage('https://abc123.supabase.co'), 'https://abc123.storage.supabase.co');
  assert.equal(hostDoStorage('http://localhost:54321'), 'http://localhost:54321');
});

test('limite de vídeo: 50 MB por padrão, ou o que estiver em VIDEO_LIMITE_MB', (t) => {
  const antes = process.env.VIDEO_LIMITE_MB;
  t.after(() => { if (antes === undefined) delete process.env.VIDEO_LIMITE_MB; else process.env.VIDEO_LIMITE_MB = antes; });
  delete process.env.VIDEO_LIMITE_MB;
  assert.equal(limiteVideoMb(), 50);
  process.env.VIDEO_LIMITE_MB = '2048';
  assert.equal(limiteVideoMb(), 2048);
  process.env.VIDEO_LIMITE_MB = 'abc';
  assert.equal(limiteVideoMb(), 50);
});

test('capa da trilha e do vídeo fica na pasta do dono, com extensão pelo tipo', () => {
  assert.equal(pastaDaCapa('trilha', 't1'), 'trilhas/t1/capas');
  assert.equal(pastaDaCapa('curso', 'c1'), 'cursos/c1/capas');
  assert.equal(caminhoDaCapa('trilhas/t1/capas', 'Foto da Equipe.JPEG', 'image/jpeg', 'ab12'), 'trilhas/t1/capas/ab12-Foto-da-Equipe.jpg');
  assert.equal(caminhoDaCapa('cursos/c1/capas', '../../x.png', 'image/png', 'ab12'), 'cursos/c1/capas/ab12-x.png');
  assert.equal(caminhoDaCapa('cursos/c1/capas', 'capa.exe', 'image/webp', 'ab12'), 'cursos/c1/capas/ab12-capa.webp');
});

test('só aceita capa da pasta do próprio dono', () => {
  assert.equal(ehCapaDaPasta('trilhas/t1/capas', 'trilhas/t1/capas/ab12-foto.jpg'), true);
  assert.equal(ehCapaDaPasta('trilhas/t1/capas', 'trilhas/t2/capas/ab12-foto.jpg'), false);
  assert.equal(ehCapaDaPasta('trilhas/t1/capas', 'trilhas/t1/capas/../../t2/foto.jpg'), false);
  assert.equal(ehCapaDaPasta('cursos/c1/capas', 'cursos/c1/capas/ab12-video.mp4'), false);
  assert.equal(ehCapaDaPasta('cursos/c1/capas', 'cursos/c1/ab12-foto.jpg'), false);
});
