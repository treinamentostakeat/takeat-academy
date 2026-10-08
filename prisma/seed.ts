/* Dados iniciais: contas da equipe e a grade modelo (25 turmas/semana).
   Rodar: npm run db:seed. A senha inicial vem de SEED_SENHA_INICIAL no .env. */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { GRADE_INICIAL } from '../src/lib/temas';

const db = new PrismaClient();

async function main() {
  const senha = process.env.SEED_SENHA_INICIAL;
  if (!senha) throw new Error('Defina SEED_SENHA_INICIAL no .env');
  const senhaHash = await bcrypt.hash(senha, 10);

  const conta = (email: string, nome: string, cargo: 'gestor' | 'instrutor') =>
    db.usuario.upsert({ where: { email }, update: {}, create: { email, nome, cargo, senhaHash } });

  await conta('onboarding@takeat.app', 'Gestor de treinamentos', 'gestor');
  const bianca = await conta('bianca@exemplo.takeat.app', 'Bianca Souza', 'instrutor');
  const rafael = await conta('rafael@exemplo.takeat.app', 'Rafael Lima', 'instrutor');

  const valeDesde = '2026-10-05';
  for (const [dia, slots] of Object.entries(GRADE_INICIAL)) {
    for (const [hora, tema] of slots) {
      await db.gradeSlot.upsert({
        where: { diaSemana_hora_valeDesde: { diaSemana: Number(dia), hora, valeDesde } },
        update: {},
        create: { diaSemana: Number(dia), hora, tema, instrutorId: bianca.id, plantaoId: rafael.id, valeDesde },
      });
    }
  }
  console.log('Seed pronto: 3 contas da equipe e grade modelo com', await db.gradeSlot.count(), 'turmas/semana.');
}

main().finally(() => db.$disconnect());
