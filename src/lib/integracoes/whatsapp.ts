import 'server-only';
import { registrar } from './fila';
import { enviarTexto, uazapiAtivo } from './uazapi';

/* WhatsApp Business Cloud API. Mensagens iniciadas pela empresa exigem modelos (templates) aprovados pela Meta.
   Nomes dos modelos no .env: WHATSAPP_TPL_INSCRICAO, WHATSAPP_TPL_LEMBRETE, WHATSAPP_TPL_CANCELAMENTO, WHATSAPP_TPL_ACESSO (idioma pt_BR).
   Cada modelo recebe os parâmetros do corpo na ordem indicada abaixo. */

export const whatsappAtivo = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
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

/** Texto do primeiro acesso (mesmo texto nos dois canais) */
export const textoPrimeiroAcesso = (nome: string, link: string, email: string) =>
  `Olá, ${nome}! Seu acesso à Takeat Academy, a plataforma de treinamentos da Takeat, está pronto.

Crie sua senha neste link: ${link}

Seu login é o e-mail ${email}. O link vale por 7 dias.`;

/** Primeiro acesso de colaborador. Parâmetros: nome, link para criar a senha, e-mail de login.
    Sai pelo número de comunicação interna (uazapi, texto livre) quando UAZAPI_TOKEN está configurado;
    senão, pela API oficial da Meta com o modelo academy_primeiro_acesso.
    O link fica fora do registro da fila (ele dá acesso à conta enquanto a senha não for criada). */
export const whatsPrimeiroAcesso = (para: string, nome: string, link: string, email: string) =>
  uazapiAtivo()
    ? registrar('whatsapp', 'primeiro_acesso', { para, nome, email, via: 'uazapi' }, () => enviarTexto('55' + para, textoPrimeiroAcesso(nome, link, email)))
    : registrar('whatsapp', 'primeiro_acesso', { para, nome, email, via: 'meta' }, ok() ? () => enviarModelo(para, tpl('WHATSAPP_TPL_ACESSO', 'academy_primeiro_acesso'), [nome, link, email]) : undefined);
