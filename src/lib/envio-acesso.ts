import 'server-only';
import { numeroWhatsApp } from './acesso-whatsapp';
import { whatsPrimeiroAcesso } from './integracoes/whatsapp';
import { linkDeAcesso, tokenDeAcesso } from './primeiro-acesso';

/* Envio automático do primeiro acesso pelo WhatsApp oficial (modelo aprovado pela Meta).
   status: enviado | erro (fica registrado na fila de integrações) | nao_configurado (sem WHATSAPP_TOKEN no servidor) | numero_invalido */
export type StatusEnvio = 'enviado' | 'erro' | 'nao_configurado' | 'numero_invalido';

/** Endereço público da Academy: APP_URL ou o endereço de quem chamou */
export const enderecoBase = (origem: string) => (process.env.APP_URL || origem).replace(/\/$/, '');

export async function enviarPrimeiroAcesso(u: { id: string; nome: string; email: string; senhaHash: string }, whatsapp: string, base: string) {
  const link = linkDeAcesso(base, tokenDeAcesso(u));
  const numero = numeroWhatsApp(whatsapp);
  if (!numero) return { status: 'numero_invalido' as StatusEnvio, link };
  const reg = await whatsPrimeiroAcesso(numero.slice(2), u.nome.trim().split(/\s+/)[0], link, u.email);
  const status: StatusEnvio = reg.status === 'enviado' ? 'enviado' : reg.status === 'demo' ? 'nao_configurado' : 'erro';
  return { status, link };
}
