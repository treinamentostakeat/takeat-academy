import 'server-only';

/* ElevenLabs: clonagem de voz (Instant Voice Cloning) e fala com a voz clonada.
   Requer ELEVENLABS_API_KEY no .env (só no servidor; nunca com prefixo NEXT_PUBLIC_).
   Os erros nunca repassam a resposta bruta, para não vazar dados da conta. */

const API = 'https://api.elevenlabs.io';
const chave = () => process.env.ELEVENLABS_API_KEY?.trim() || '';
export const elevenlabsAtivo = () => !!chave();

export const MODELO_FALA = 'eleven_multilingual_v2';
export const LIMITE_AMOSTRAS_MB = 4; // limite do corpo da requisição no Vercel (4,5 MB) com folga
export const LIMITE_TEXTO = 500;

export class ErroElevenLabs extends Error {
  constructor(public status: number, mensagem: string) { super(mensagem); }
}

async function chamar(caminho: string, init: RequestInit = {}) {
  if (!elevenlabsAtivo()) throw new ErroElevenLabs(503, 'A integração com a ElevenLabs não está configurada neste servidor.');
  const r = await fetch(API + caminho, { ...init, cache: 'no-store', headers: { 'xi-api-key': chave(), ...(init.headers || {}) } });
  if (r.ok) return r;
  let detalhe = '';
  try { const j = await r.json(); detalhe = typeof j?.detail === 'string' ? j.detail : j?.detail?.message ?? ''; } catch { /* sem corpo */ }
  const m = detalhe.toLowerCase();
  if (r.status === 401 && m.includes('permission')) throw new ErroElevenLabs(403, 'A chave da ElevenLabs não tem permissão para esta ação. Libere-a nas configurações da chave.');
  if (r.status === 401) throw new ErroElevenLabs(502, 'A chave da ElevenLabs foi recusada. Confira se ela ainda é válida.');
  if (r.status === 402 || m.includes('subscription') || m.includes('upgrade') || m.includes('plan')) throw new ErroElevenLabs(402, 'O plano da conta ElevenLabs não permite esta ação (a clonagem de voz exige um plano pago).');
  if (r.status === 429) throw new ErroElevenLabs(429, 'Limite de uso da ElevenLabs atingido. Tente de novo em alguns minutos.');
  if (r.status === 400 || r.status === 422) throw new ErroElevenLabs(400, detalhe ? `A ElevenLabs recusou o pedido: ${detalhe.slice(0, 200)}` : 'A ElevenLabs recusou o pedido.');
  throw new ErroElevenLabs(502, `A ElevenLabs respondeu ${r.status}. Tente de novo.`);
}

export type VozClonada = { voiceId: string; nome: string; descricao: string; criadaEm: string | null };

/** Vozes clonadas da conta (as vozes prontas da ElevenLabs ficam de fora) */
export async function listarVozes(): Promise<VozClonada[]> {
  const r = await chamar('/v2/voices?category=cloned&page_size=100');
  const j = (await r.json()) as { voices?: { voice_id: string; name: string; description?: string | null; created_at_unix?: number | null }[] };
  return (j.voices ?? []).map((v) => ({
    voiceId: v.voice_id, nome: v.name, descricao: v.description ?? '',
    criadaEm: v.created_at_unix ? new Date(v.created_at_unix * 1000).toISOString() : null,
  }));
}

/** Clona uma voz a partir de amostras de áudio. Devolve o voice_id, que identifica a voz nas próximas chamadas. */
export async function clonarVoz(nome: string, amostras: File[], descricao = '') {
  const corpo = new FormData();
  corpo.append('name', nome);
  if (descricao) corpo.append('description', descricao);
  corpo.append('remove_background_noise', 'true');
  for (const a of amostras) corpo.append('files', a, a.name);
  const r = await chamar('/v1/voices/add', { method: 'POST', body: corpo });
  const j = (await r.json()) as { voice_id: string; requires_verification?: boolean };
  return { voiceId: j.voice_id, requerVerificacao: !!j.requires_verification };
}

/** Texto falado na voz clonada, em MP3 */
export async function falar(voiceId: string, texto: string) {
  const r = await chamar(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: texto, model_id: MODELO_FALA }),
  });
  return r.arrayBuffer();
}

/** Remove a voz da conta */
export async function apagarVoz(voiceId: string) {
  await chamar(`/v1/voices/${encodeURIComponent(voiceId)}`, { method: 'DELETE' });
}
