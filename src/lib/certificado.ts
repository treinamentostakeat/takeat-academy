import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/* Certificado em PDF com cara de diploma: fundo marfim, moldura fina dourada, nome em serifada grande,
   trilha, data, assinatura e código de validação. Usa as fontes padrão do PDF (Times e Helvetica), sem baixar nada. */

const MARFIM = rgb(0.969, 0.953, 0.918);
const OURO = rgb(0.788, 0.663, 0.431);
const TINTA = rgb(0.086, 0.082, 0.078);
const CINZA = rgb(0.42, 0.4, 0.37);
const VERMELHO = rgb(0.784, 0.075, 0.102);

/** As fontes padrão do PDF só têm o alfabeto latino (WinAnsi): o que não couber sai do texto em vez de quebrar o arquivo */
const seguro = (s: string) => s.normalize('NFC').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').trim();

/** previa = modelo para quem edita o conteúdo: selo "Prévia" e sem código de validação */
export async function gerarCertificado(d: { nome: string; trilha: string; data: string; codigo: string; validarEm: string; previa?: boolean }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificado - ${seguro(d.trilha)} - ${seguro(d.nome)}`);
  pdf.setAuthor('Takeat Academy');
  const pg = pdf.addPage([842, 595]); // A4 deitado
  const { width: W, height: H } = pg.getSize();
  const [serif, serifIt, sans, sansB] = await Promise.all([
    pdf.embedFont(StandardFonts.TimesRoman), pdf.embedFont(StandardFonts.TimesRomanItalic),
    pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold),
  ]);
  type Fonte = typeof serif;
  const centro = (t: string, y: number, f: Fonte, tam: number, cor = TINTA, espaco = 0) => {
    const txt = seguro(t);
    const w = f.widthOfTextAtSize(txt, tam) + espaco * Math.max(0, txt.length - 1);
    pg.drawText(txt, { x: (W - w) / 2, y, size: tam, font: f, color: cor, characterSpacing: espaco } as Parameters<typeof pg.drawText>[1]);
  };
  // Texto que pode ser longo (nome, trilha): diminui até caber
  const caber = (t: string, f: Fonte, tam: number, max: number) => { let s = tam; while (s > 14 && f.widthOfTextAtSize(seguro(t), s) > max) s -= 1; return s; };

  // Fundo e moldura dupla dourada
  pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: MARFIM });
  pg.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: OURO, borderWidth: 1.2 });
  pg.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: OURO, borderWidth: 0.5 });
  // Cantos
  for (const [x, y] of [[32, 32], [W - 32, 32], [32, H - 32], [W - 32, H - 32]]) pg.drawCircle({ x, y, size: 3, color: OURO });

  centro('TAKEAT ACADEMY', H - 92, sansB, 10, CINZA, 3);
  pg.drawLine({ start: { x: W / 2 - 18, y: H - 106 }, end: { x: W / 2 + 18, y: H - 106 }, thickness: 1, color: VERMELHO });
  centro('Certificado de conclusão', H - 160, serifIt, 34, TINTA);
  centro('Certificamos que', H - 210, sans, 12, CINZA);
  const tamNome = caber(d.nome, serif, 46, W - 180);
  centro(d.nome, H - 268, serif, tamNome, TINTA);
  pg.drawLine({ start: { x: W / 2 - 200, y: H - 284 }, end: { x: W / 2 + 200, y: H - 284 }, thickness: 0.6, color: OURO });
  centro('concluiu a trilha', H - 318, sans, 12, CINZA);
  centro(d.trilha, H - 352, serifIt, caber(d.trilha, serifIt, 26, W - 200), TINTA);
  centro(`em ${d.data}`, H - 384, sans, 12, CINZA);

  // Assinatura
  const ax = W / 2 - 120;
  pg.drawLine({ start: { x: ax, y: 128 }, end: { x: ax + 240, y: 128 }, thickness: 0.6, color: TINTA });
  centro('Pessoas e Cultura', 110, serifIt, 14, TINTA);
  centro('Takeat', 94, sans, 10, CINZA, 1);

  // Código de validação
  if (d.previa) {
    centro('Prévia do certificado: o código de validação aparece no certificado de quem concluir a trilha', 52, sans, 9, CINZA);
    const selo = 'PRÉVIA', tam = 11, w = sansB.widthOfTextAtSize(selo, tam) + 6 * 2.5;
    pg.drawRectangle({ x: W - 64 - w - 16, y: H - 86, width: w + 16, height: 24, borderColor: VERMELHO, borderWidth: 1 });
    pg.drawText(selo, { x: W - 64 - w - 8, y: H - 78, size: tam, font: sansB, color: VERMELHO, characterSpacing: 2.5 } as Parameters<typeof pg.drawText>[1]);
  } else {
    centro(`Código de validação: ${d.codigo}`, 58, sans, 9, CINZA, 0.5);
    centro(`Confira em ${d.validarEm}`, 46, sans, 8, CINZA);
  }

  return pdf.save();
}
