import Link from 'next/link';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import { idDoToken, lerTokenDeAcesso } from '@/lib/primeiro-acesso';
import { FormAcesso } from './FormAcesso';
import '@/app/equipe/(area)/conta/conta.css';
import '@/app/equipe/entrar/entrar.css';

export const metadata = { title: 'Primeiro acesso', robots: { index: false } };

/* Primeiro acesso pelo link do WhatsApp: a pessoa cria a própria senha e já entra na Academy. */
export default async function PrimeiroAcesso({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const id = idDoToken(token);
  const u = id ? await db.usuario.findUnique({ where: { id }, select: { nome: true, email: true, ativo: true, senhaHash: true } }) : null;
  const valido = !!u && u.ativo && !!lerTokenDeAcesso(token, () => u.senhaHash);

  return (
    <main className="login ct">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo em SVG, como na tela de login */}
        <span className="brand"><img src="/brand/takeat-logo.svg" alt="Takeat" /><span>Academy</span></span>
        {valido ? (
          <>
            <div>
              <h1>Boas-vindas, {u!.nome.split(' ')[0]}!</h1>
              <p>Crie sua senha para entrar na Takeat Academy. Seu login é o e-mail <b>{u!.email}</b>.</p>
            </div>
            <FormAcesso token={token} email={u!.email} />
          </>
        ) : (
          <>
            <div>
              <h1>Link vencido ou já usado</h1>
              <p>Este link de primeiro acesso não vale mais. Se você já criou sua senha, é só entrar. Se não, peça um novo link ao RH.</p>
            </div>
            <Link className="btn btn-l btn-filled" href="/interno/entrar">Ir para o login</Link>
          </>
        )}
      </div>
    </main>
  );
}
