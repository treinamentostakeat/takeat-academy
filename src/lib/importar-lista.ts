import { numeroWhatsApp } from './acesso-whatsapp';

/* Lista colada da planilha (Excel, Google Sheets, CSV): uma pessoa por linha.
   As colunas podem vir em qualquer ordem: o e-mail é a que tem "@", o WhatsApp é a que tem 10 ou mais dígitos,
   o nome é o primeiro texto que sobra e o departamento, o segundo. Cabeçalho (linha com "e-mail"/"email") é ignorado. */

export type PessoaLista = { linha: number; nome: string; email: string; whatsapp: string; departamento: string; erro: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digitos = (s: string) => s.replace(/\D/g, '');

/** Separador mais provável: tabulação (colado da planilha), ponto e vírgula ou vírgula */
function separador(linhas: string[]) {
  const t = linhas.join('\n');
  if (t.includes('\t')) return '\t';
  return (t.match(/;/g)?.length ?? 0) >= (t.match(/,/g)?.length ?? 0) ? ';' : ',';
}

export function lerLista(texto: string): PessoaLista[] {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) return [];
  const sep = separador(linhas);
  const vistos = new Set<string>();
  const saida: PessoaLista[] = [];
  linhas.forEach((l, i) => {
    const cols = l.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1').trim()).filter(Boolean);
    if (i === 0 && cols.some((c) => /^e-?mail$/i.test(c))) return; // cabeçalho
    const email = (cols.find((c) => c.includes('@')) ?? '').toLowerCase();
    const whats = cols.find((c) => !c.includes('@') && digitos(c).length >= 10 && /^[\d\s()+.-]+$/.test(c)) ?? '';
    const textos = cols.filter((c) => c !== cols.find((x) => x.includes('@')) && c !== whats);
    const nome = (textos[0] ?? '').replace(/\s+/g, ' ');
    const departamento = (textos[1] ?? '').slice(0, 60);
    let erro = '';
    if (nome.length < 3) erro = 'Falta o nome';
    else if (!EMAIL.test(email)) erro = 'E-mail inválido';
    else if (vistos.has(email)) erro = 'E-mail repetido na lista';
    else if (whats && !numeroWhatsApp(whats)) erro = 'WhatsApp inválido';
    else if (!whats) erro = 'Falta o WhatsApp';
    vistos.add(email);
    saida.push({ linha: i + 1, nome: nome.slice(0, 80), email, whatsapp: whats, departamento, erro });
  });
  return saida;
}
