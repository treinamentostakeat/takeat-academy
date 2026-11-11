import { NextResponse, type NextRequest } from 'next/server';
import { LIMITE_AMOSTRAS_MB, clonarVoz } from '@/lib/integracoes/elevenlabs';
import { erroVoz, quemPodeVoz, registrarVoz, respostaDeErro } from '@/lib/voz-acesso';

/* Clonagem de voz: POST multipart { nome, consentimento: "sim", arquivos[] } → { voiceId }.
   Rota (e não Server Action) porque as amostras passam do limite de 1 MB das ações. */

const EXT = /\.(mp3|wav|m4a|ogg|webm|flac|aac)$/i;

export async function POST(req: NextRequest) {
  const quem = await quemPodeVoz();
  if ('erro' in quem) return quem.erro;

  const form = await req.formData().catch(() => null);
  if (!form) return erroVoz(400, `Envie os áudios como formulário. O total precisa ter até ${LIMITE_AMOSTRAS_MB} MB.`);
  const nome = String(form.get('nome') ?? '').trim();
  if (nome.length < 2 || nome.length > 80) return erroVoz(400, 'Dê um nome à voz, com 2 a 80 caracteres.');
  if (form.get('consentimento') !== 'sim') return erroVoz(400, 'Confirme que você tem autorização da pessoa dona da voz.');

  const arquivos = form.getAll('arquivos').filter((a): a is File => a instanceof File && a.size > 0);
  if (!arquivos.length) return erroVoz(400, 'Envie pelo menos um áudio.');
  if (arquivos.length > 5) return erroVoz(400, 'Envie no máximo 5 áudios.');
  if (arquivos.some((a) => !a.type.startsWith('audio/') && !EXT.test(a.name))) return erroVoz(400, 'Envie apenas arquivos de áudio (MP3, WAV, M4A, OGG, WebM, FLAC ou AAC).');
  const total = arquivos.reduce((n, a) => n + a.size, 0);
  if (total > LIMITE_AMOSTRAS_MB * 1024 * 1024) return erroVoz(413, `Os áudios somam ${(total / 1024 / 1024).toFixed(1)} MB. O limite é de ${LIMITE_AMOSTRAS_MB} MB no total.`);

  try {
    const r = await clonarVoz(nome, arquivos, `Clonada no Takeat Academy por ${quem.u.nome}`);
    await registrarVoz('clonagem', { voiceId: r.voiceId, nome, por: quem.u.email, amostras: arquivos.length, consentimento: true });
    return NextResponse.json(r, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
