import 'server-only';
import { registrar } from './fila';

/* WhatsApp Business Cloud API. Mensagens iniciadas pela empresa exigem modelos (templates) aprovados pela Meta.
   Nomes dos modelos no .env: WHATSAPP_TPL_INSCRICAO, WHATSAPP_TPL_LEMBRETE, WHATSAPP_TPL_CANCELAMENTO (idioma pt_BR).
   Cada modelo recebe os parâmetros do corpo na ordem indicada abaixo. */

const ok = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

async function enviarModelo(para: string, modelo: string, params: string[]) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: '55' + para, type: 'template',
      template: { name: modelo, language: { code: 'pt_BR' }, components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] },
    }),
  });
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

const tpl = (k: string, padrao: string) => process.env[k] || padrao;

/** Parâmetros: nome, tema, quando, link da sala */
export const whatsInscricao = (para: string, nome: string, tema: string, quando: string, link: string) =>
  registrar('whatsapp', 'inscricao', { para, nome, tema, quando, link }, ok() ? () => enviarModelo(para, tpl('WHATSAPP_TPL_INSCRICAO', 'academy_inscricao'), [nome, tema, quando, link]) : undefined);

/** Parâmetros: nome, tema, quando, link para escolher outro horário */
export const whatsCancelamento = (para: string, nome: string, tema: string, quando: string, link: string) =>
  registrar('whatsapp', 'cancelamento', { para, nome, tema, quando, link }, ok() ? () => enviarModelo(para, tpl('WHATSAPP_TPL_CANCELAMENTO', 'academy_cancelamento'), [nome, tema, quando, link]) : undefined);

/** Parâmetros: nome, tema, horário, link da sala */
export const whatsLembrete = (para: string, nome: string, tema: string, hora: string, link: string) =>
  registrar('whatsapp', 'lembrete', { para, nome, tema, hora, link }, ok() ? () => enviarModelo(para, tpl('WHATSAPP_TPL_LEMBRETE', 'academy_lembrete'), [nome, tema, hora, link]) : undefined);
