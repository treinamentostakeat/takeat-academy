/* Gamificação da Academy: TODAS as regras ficam aqui (XP, níveis, missões da comanda e conquistas).
   Para ajustar pontos ou níveis, mude só este arquivo. O cálculo é feito a partir do que a pessoa já fez
   (cursos concluídos, tentativas de quiz e vídeos abertos), então mudar uma regra recalcula tudo na hora. */

/* ---------- XP ---------- */
export const XP = {
  /** Cada curso concluído (quiz aprovado) */
  cursoConcluido: 100,
  /** Bônus pela melhor nota do curso: 90% ou mais de acertos */
  notaAlta: 25,
  /** Bônus pela melhor nota do curso: 100% de acertos (substitui o de nota alta) */
  gabarito: 50,
  /** Aprovado na primeira tentativa do quiz */
  dePrimeira: 20,
  /** Fechar a comanda da semana (as 3 missões) */
  comandaFechada: 75,
  // Quando as aulas internas ao vivo existirem: presença na aula e participação no chat entram aqui.
} as const;

export const NOTA_ALTA = 0.9;

/* ---------- Níveis de cozinha ---------- */
export const NIVEIS = [
  { nome: 'Ajudante', min: 0 },
  { nome: 'Cozinheiro', min: 300 },
  { nome: 'Sous-chef', min: 800 },
  { nome: 'Chef', min: 1500 },
  { nome: 'Chef Executivo', min: 2500 },
] as const;

export function nivelDe(xp: number) {
  let i = 0;
  for (let k = 0; k < NIVEIS.length; k++) if (xp >= NIVEIS[k].min) i = k;
  const atual = NIVEIS[i], prox = NIVEIS[i + 1] ?? null;
  const pct = prox ? Math.round(((xp - atual.min) / (prox.min - atual.min)) * 100) : 100;
  return { indice: i, nome: atual.nome, min: atual.min, prox: prox ? { nome: prox.nome, min: prox.min, falta: prox.min - xp } : null, pct };
}

/* ---------- Eventos (o que a pessoa fez) ---------- */
export type Evento =
  | { tipo: 'curso'; em: Date; cursoId: string; acertos: number; total: number }
  | { tipo: 'quiz'; em: Date; cursoId: string; acertos: number; total: number; aprovada: boolean }
  | { tipo: 'video'; em: Date; cursoId: string };

/* ---------- Semanas (segunda a domingo, no horário de Brasília) ---------- */
const TZ = () => process.env.TZ_AULAS || 'America/Sao_Paulo';
const diaLocal = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ() }); // AAAA-MM-DD

/** Segunda-feira da semana da data, "AAAA-MM-DD" */
export function semanaDe(d: Date) {
  const t = Date.parse(diaLocal(d) + 'T00:00:00Z');
  const dow = (new Date(t).getUTCDay() + 6) % 7; // 0 = segunda
  return new Date(t - dow * 86400000).toISOString().slice(0, 10);
}
const semanaAnterior = (s: string) => new Date(Date.parse(s + 'T00:00:00Z') - 7 * 86400000).toISOString().slice(0, 10);

/* ---------- Comanda da semana: 3 missões, uma de cada família ---------- */
type Missao = { id: string; texto: string; meta: number; conta: (ev: Evento[]) => number };
const distintos = (ev: Evento[], tipo: Evento['tipo']) => new Set(ev.filter((e) => e.tipo === tipo).map((e) => e.cursoId)).size;
const contar = (ev: Evento[], f: (e: Evento) => boolean) => ev.filter(f).length;

export const MISSOES: Missao[][] = [
  [
    { id: 'curso1', texto: 'Conclua 1 curso', meta: 1, conta: (ev) => distintos(ev, 'curso') },
    { id: 'curso2', texto: 'Conclua 2 cursos', meta: 2, conta: (ev) => distintos(ev, 'curso') },
  ],
  [
    { id: 'quiz1', texto: 'Faça 1 quiz', meta: 1, conta: (ev) => contar(ev, (e) => e.tipo === 'quiz') },
    { id: 'quiz3', texto: 'Faça 3 quizzes', meta: 3, conta: (ev) => contar(ev, (e) => e.tipo === 'quiz') },
    { id: 'gabarito', texto: 'Acerte todas as perguntas de um quiz', meta: 1, conta: (ev) => contar(ev, (e) => e.tipo === 'quiz' && e.total > 0 && e.acertos === e.total) },
  ],
  [
    { id: 'video1', texto: 'Assista a 1 vídeo de curso', meta: 1, conta: (ev) => distintos(ev, 'video') },
    { id: 'video2', texto: 'Assista a vídeos de 2 cursos diferentes', meta: 2, conta: (ev) => distintos(ev, 'video') },
  ],
];

/** Número estável a partir da semana: toda pessoa recebe as mesmas missões na mesma semana */
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export function missoesDaSemana(semana: string) {
  const h = hash(semana);
  return MISSOES.map((fam, i) => fam[(h >>> (i * 4)) % fam.length]);
}

export function comandaDa(semana: string, eventosDaSemana: Evento[]) {
  const itens = missoesDaSemana(semana).map((m) => {
    const feito = Math.min(m.meta, m.conta(eventosDaSemana));
    return { id: m.id, texto: m.texto, meta: m.meta, feito, ok: feito >= m.meta };
  });
  return { semana, itens, fechada: itens.every((i) => i.ok) };
}

/* ---------- Conquistas (cardápio) ---------- */
export type Secao = 'Entradas' | 'Pratos principais' | 'Sobremesas';
export type Resumo = {
  cursos: number; gabaritos: number; dePrimeira: number; comandas: number; streak: number; maiorStreak: number;
  cursosNoMesmoDia: number; passaporteCompleto: boolean; formaturas: number;
};
export const CONQUISTAS: { id: string; secao: Secao; nome: string; dica: string; icone: string; ok: (r: Resumo) => boolean }[] = [
  { id: 'primeiro-curso', secao: 'Entradas', nome: 'Primeiro prato', dica: 'Conclua o seu primeiro curso.', icone: 'restaurant', ok: (r) => r.cursos >= 1 },
  { id: 'cinco-cursos', secao: 'Entradas', nome: 'Mesa cheia', dica: 'Conclua 5 cursos.', icone: 'table_restaurant', ok: (r) => r.cursos >= 5 },
  { id: 'primeira-comanda', secao: 'Entradas', nome: 'Comanda fechada', dica: 'Feche a comanda da semana: as 3 missões.', icone: 'receipt_long', ok: (r) => r.comandas >= 1 },
  { id: 'gabarito', secao: 'Pratos principais', nome: 'Ponto certo', dica: 'Acerte todas as perguntas de um quiz.', icone: 'check_circle', ok: (r) => r.gabaritos >= 1 },
  { id: 'tres-gabaritos', secao: 'Pratos principais', nome: 'Mão de chef', dica: 'Gabarite 3 quizzes.', icone: 'workspace_premium', ok: (r) => r.gabaritos >= 3 },
  { id: 'de-primeira', secao: 'Pratos principais', nome: 'De primeira', dica: 'Passe no quiz na primeira tentativa em 5 cursos.', icone: 'bolt', ok: (r) => r.dePrimeira >= 5 },
  { id: 'dez-cursos', secao: 'Pratos principais', nome: 'Casa lotada', dica: 'Conclua 10 cursos.', icone: 'groups', ok: (r) => r.cursos >= 10 },
  { id: 'maratona', secao: 'Pratos principais', nome: 'Rush do almoço', dica: 'Conclua 3 cursos no mesmo dia.', icone: 'timer', ok: (r) => r.cursosNoMesmoDia >= 3 },
  { id: 'passaporte', secao: 'Sobremesas', nome: 'Passaporte carimbado', dica: 'Conclua todos os cursos de "Conheça os setores".', icone: 'travel_explore', ok: (r) => r.passaporteCompleto },
  { id: 'fogo-3', secao: 'Sobremesas', nome: 'Fogo aceso', dica: 'Tenha atividade em 3 semanas seguidas.', icone: 'local_fire_department', ok: (r) => r.maiorStreak >= 3 },
  { id: 'fregues', secao: 'Sobremesas', nome: 'Freguês da casa', dica: 'Feche 4 comandas da semana.', icone: 'loyalty', ok: (r) => r.comandas >= 4 },
  { id: 'formatura', secao: 'Sobremesas', nome: 'Formatura', dica: 'Conclua todos os cursos de uma trilha.', icone: 'school', ok: (r) => r.formaturas >= 1 },
];

/* ---------- Cálculo ---------- */
export function calcular(eventos: Evento[], extra: { passaporteCompleto: boolean; formaturas: number }, agora = new Date()) {
  const extrato: { motivo: string; xp: number }[] = [];
  const somar = (motivo: string, xp: number, n = 1) => { if (n > 0 && xp) extrato.push({ motivo, xp: xp * n }); };

  // Cursos: o melhor resultado aprovado de cada um
  const cursos = eventos.filter((e): e is Extract<Evento, { tipo: 'curso' }> => e.tipo === 'curso');
  const gabaritos = cursos.filter((c) => c.total > 0 && c.acertos === c.total).length;
  const altas = cursos.filter((c) => c.total > 0 && c.acertos < c.total && c.acertos / c.total >= NOTA_ALTA).length;
  // Aprovado de primeira: a primeira tentativa do curso já foi aprovada
  const primeiras = new Map<string, Extract<Evento, { tipo: 'quiz' }>>();
  for (const e of eventos) if (e.tipo === 'quiz') { const p = primeiras.get(e.cursoId); if (!p || e.em < p.em) primeiras.set(e.cursoId, e); }
  const dePrimeira = [...primeiras.values()].filter((q) => q.aprovada).length;

  somar('Cursos concluídos', XP.cursoConcluido, cursos.length);
  somar('Quizzes gabaritados', XP.gabarito, gabaritos);
  somar('Notas acima de 90%', XP.notaAlta, altas);
  somar('Aprovado de primeira', XP.dePrimeira, dePrimeira);

  // Comandas: todas as semanas com atividade, mais a semana atual
  const porSemana = new Map<string, Evento[]>();
  for (const e of eventos) { const s = semanaDe(e.em); porSemana.set(s, [...(porSemana.get(s) ?? []), e]); }
  const atual = semanaDe(agora);
  const comandas = [...porSemana.keys()].map((s) => comandaDa(s, porSemana.get(s)!));
  const fechadas = comandas.filter((c) => c.fechada).length;
  somar('Comandas fechadas', XP.comandaFechada, fechadas);

  // Streak: semanas seguidas com atividade (a semana atual ainda vale se a anterior teve atividade)
  const ativas = new Set(porSemana.keys());
  let streak = 0;
  for (let s = ativas.has(atual) ? atual : semanaAnterior(atual); ativas.has(s); s = semanaAnterior(s)) streak++;
  let maiorStreak = 0;
  for (const s of ativas) { if (ativas.has(semanaAnterior(s))) continue; let n = 0; for (let x = s; ativas.has(x); x = new Date(Date.parse(x + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10)) n++; maiorStreak = Math.max(maiorStreak, n); }

  // Cursos concluídos no mesmo dia (maior número)
  const porDia = new Map<string, number>();
  for (const c of cursos) { const d = diaLocal(c.em); porDia.set(d, (porDia.get(d) ?? 0) + 1); }
  const cursosNoMesmoDia = Math.max(0, ...porDia.values());

  const resumo: Resumo = { cursos: cursos.length, gabaritos, dePrimeira, comandas: fechadas, streak, maiorStreak, cursosNoMesmoDia, ...extra };
  const xp = extrato.reduce((n, l) => n + l.xp, 0);
  return {
    xp, nivel: nivelDe(xp), extrato, resumo,
    comanda: comandaDa(atual, porSemana.get(atual) ?? []),
    conquistas: CONQUISTAS.map((c) => ({ id: c.id, secao: c.secao, nome: c.nome, dica: c.dica, icone: c.icone, ok: c.ok(resumo) })),
  };
}
export type Jogo = ReturnType<typeof calcular>;
