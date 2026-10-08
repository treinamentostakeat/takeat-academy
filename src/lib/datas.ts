/* Datas e horários das aulas, sempre no fuso de São Paulo.
   Datas trafegam como texto "AAAA-MM-DD" para não sofrer com fuso. */

const TZ = process.env.TZ_AULAS || 'America/Sao_Paulo';

export const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Agora no fuso das aulas: { data: 'AAAA-MM-DD', hora: 13.33 }. RELOGIO no .env fixa o relógio em desenvolvimento. */
export function agora(): { data: string; hora: number } {
  const fixo = process.env.RELOGIO;
  if (fixo) {
    const [d, t = '00:00'] = fixo.split('T');
    const [h, m] = t.split(':').map(Number);
    return { data: d, hora: h + (m || 0) / 60 };
  }
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((a, x) => ((a[x.type] = x.value), a), {});
  return { data: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) + Number(p.minute) / 60 };
}
export const hoje = () => agora().data;

/* Aritmética de datas em UTC puro (sem fuso) */
export const parse = (iso: string) => new Date(iso + 'T00:00:00Z');
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const somaDias = (isoData: string, n: number) => { const d = parse(isoData); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export const diaSemana = (isoData: string) => parse(isoData).getUTCDay(); // 0 dom … 6 sáb
export const segundaDe = (isoData: string) => { const w = diaSemana(isoData); return somaDias(isoData, w === 0 ? -6 : 1 - w); };
export const diasUteis = (deIso: string, ateIso: string) => {
  const out: string[] = [];
  for (let d = deIso; d <= ateIso; d = somaDias(d, 1)) { const w = diaSemana(d); if (w >= 1 && w <= 5) out.push(d); }
  return out;
};

/* Rótulos em português */
export const rotuloDia = (isoData: string) => { const d = parse(isoData); const s = DIAS[d.getUTCDay()]; return `${s[0].toUpperCase()}${s.slice(1)}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
export const rotuloCurto = (isoData: string) => { const d = parse(isoData); return `${DIAS_CURTOS[d.getUTCDay()]}, ${d.getUTCDate()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
export const rotuloSemana = (segunda: string) => {
  const a = parse(segunda), b = parse(somaDias(segunda, 4));
  return `${a.getUTCDate()}${a.getUTCMonth() !== b.getUTCMonth() ? ' de ' + MESES[a.getUTCMonth()] : ''} a ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]}`;
};
export const faixa = (h: number) => `${h}h às ${h + 1}h`;

/* Situação de uma turma pelo relógio */
type ComHorario = { data: string; hora: number; status?: string; iniciadaEm?: Date | null; encerradaEm?: Date | null };
export const MIN_ANTES_SALA = 10; // a sala abre 10 minutos antes

export function situacao(t: ComHorario): 'cancelada' | 'realizada' | 'ao-vivo' | 'agendada' {
  if (t.status === 'cancelada') return 'cancelada';
  if (t.encerradaEm) return 'realizada';
  const n = agora();
  if (t.data < n.data || (t.data === n.data && n.hora >= t.hora + 1)) return 'realizada';
  if (t.data === n.data && n.hora >= t.hora) return 'ao-vivo';
  return 'agendada';
}
/** Já passou (cliente não vê nem se inscreve) */
export const passou = (t: ComHorario) => { const s = situacao(t); return s === 'realizada'; };
/** Sala aberta para entrar: 10 min antes até o fim */
export function salaAberta(t: ComHorario) {
  if (t.status === 'cancelada' || t.encerradaEm) return false;
  const n = agora();
  return t.data === n.data && n.hora >= t.hora - MIN_ANTES_SALA / 60 && n.hora < t.hora + 1;
}
