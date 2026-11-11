import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { LIMITE_TEXTO, falar } from '@/lib/integracoes/elevenlabs';
import { erroVoz, quemPodeVoz, registrarVoz, respostaDeErro } from '@/lib/voz-acesso';

/* Fala com a voz clonada: POST { voiceId, texto } → áudio MP3 */

const Corpo = z.object({ voiceId: z.string().regex(/^[A-Za-z0-9]{10,40}$/), texto: z.string().trim().min(1).max(LIMITE_TEXTO) });

export async function POST(req: NextRequest) {
  const quem = await quemPodeVoz();
  if ('erro' in quem) return quem.erro;
  const p = Corpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return erroVoz(400, `Escreva um texto de 1 a ${LIMITE_TEXTO} caracteres.`);
  try {
    const mp3 = await falar(p.data.voiceId, p.data.texto);
    await registrarVoz('fala', { voiceId: p.data.voiceId, por: quem.u.email, caracteres: p.data.texto.length });
    return new Response(mp3, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
