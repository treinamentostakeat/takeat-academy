import { soNumeros } from './formato';

/* Envio do acesso pelo WhatsApp do próprio RH: monta a mensagem e o link wa.me (abre o WhatsApp com o texto pronto).
   Nada é enviado pelo servidor; a pessoa que criou o acesso só confere e aperta enviar. */

/** Mensagem com o acesso: endereço, e-mail e senha provisória */
export function mensagemDeAcesso(d: { nome: string; endereco: string; email: string; senha: string; nova: boolean }) {
  const primeiro = d.nome.trim().split(/\s+/)[0] || '';
  return [
    `Olá${primeiro ? `, ${primeiro}` : ''}! ${d.nova ? 'Sua nova senha provisória da Takeat Academy está pronta.' : 'Seu acesso à Takeat Academy está pronto.'}`,
    '',
    `Acesse: ${d.endereco}`,
    `E-mail: ${d.email}`,
    `Senha provisória: ${d.senha}`,
    '',
    'No primeiro acesso, você cria uma senha só sua. Boas-vindas!',
  ].join('\n');
}

/** Número para o wa.me: só dígitos com o código do país. Aceita com ou sem 55. Inválido ou vazio volta "". */
export function numeroWhatsApp(v: string) {
  const n = soNumeros(v);
  if (n.length === 10 || n.length === 11) return `55${n}`;
  if ((n.length === 12 || n.length === 13) && n.startsWith('55')) return n;
  return '';
}

/** Link que abre o WhatsApp com a mensagem pronta. Sem número, o WhatsApp pede para escolher o contato. */
export const linkWhatsApp = (numero: string, texto: string) => `https://wa.me/${numeroWhatsApp(numero)}?text=${encodeURIComponent(texto)}`;
