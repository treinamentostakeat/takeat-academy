import 'server-only';

/* uazapi: WhatsApp pelo número de comunicação interna da Takeat (texto livre, sem modelo da Meta).
   Requer UAZAPI_TOKEN (token da instância) no .env, só no servidor. UAZAPI_URL é o servidor (padrão: automate-takeat).
   Documentação: https://docs.uazapi.com/ (POST /send/text, cabeçalho "token"). */

export const uazapiAtivo = () => !!process.env.UAZAPI_TOKEN?.trim();
const servidor = () => (process.env.UAZAPI_URL?.trim() || 'https://automate-takeat.uazapi.com').replace(/\/$/, '');

/** Envia texto. numero: só dígitos, com o 55 (ex.: 5527999998888). Sem nova tentativa automática: a uazapi pede para não repetir envio. */
export async function enviarTexto(numero: string, texto: string) {
  const r = await fetch(`${servidor()}/send/text`, {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
    headers: { token: process.env.UAZAPI_TOKEN!.trim(), 'Content-Type': 'application/json', Accept: 'application/json' },
    // delay: mostra "digitando..." por um instante, como uma mensagem de pessoa
    body: JSON.stringify({ number: numero, text: texto, linkPreview: true, delay: 1200 }),
  });
  if (r.ok) return;
  // Erro sem repassar a resposta bruta: só a mensagem curta (a uazapi manda em português quando é do WhatsApp)
  let detalhe = '';
  try { const j = await r.json(); detalhe = String(j?.message_ptbr || j?.error || '').slice(0, 200); } catch { /* sem corpo */ }
  throw new Error(`uazapi ${r.status}${detalhe ? `: ${detalhe}` : ''}`);
}
