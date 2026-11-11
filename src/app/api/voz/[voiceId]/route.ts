import { NextResponse, type NextRequest } from 'next/server';
import { apagarVoz } from '@/lib/integracoes/elevenlabs';
import { erroVoz, quemPodeVoz, registrarVoz, respostaDeErro } from '@/lib/voz-acesso';

/* Apaga uma voz clonada da conta ElevenLabs: DELETE /api/voz/<voiceId> */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ voiceId: string }> }) {
  const quem = await quemPodeVoz();
  if ('erro' in quem) return quem.erro;
  const { voiceId } = await ctx.params;
  if (!/^[A-Za-z0-9]{10,40}$/.test(voiceId)) return erroVoz(400, 'Voz inválida.');
  try {
    await apagarVoz(voiceId);
    await registrarVoz('exclusao', { voiceId, por: quem.u.email });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
