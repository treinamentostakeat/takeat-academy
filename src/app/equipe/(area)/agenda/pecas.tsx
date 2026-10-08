import type { Sit } from '@/lib/equipe';

/* Chip de situação da turma (agenda e detalhe) */
const SIT: Record<Sit, { l: string; cls: string }> = {
  cancelada: { l: 'Cancelada', cls: 'chip-cancel' },
  'ao-vivo': { l: 'Ao vivo', cls: 'chip-red' },
  realizada: { l: 'Realizada', cls: 'chip-neutral' },
  agendada: { l: 'Agendada', cls: 'chip-teal' },
};
export function ChipSit({ sit }: { sit: Sit }) {
  return <span className={`chip ${SIT[sit].cls}`}>{sit === 'ao-vivo' && <span className="pulse" aria-hidden="true" />}{SIT[sit].l}</span>;
}
export const rotuloSit = (s: Sit) => SIT[s].l;
