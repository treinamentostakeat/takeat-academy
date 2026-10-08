import { redirect } from 'next/navigation';
import { entrar, usuarioAtual } from '@/lib/sessao';
import './entrar.css';

export const metadata = { title: 'Entrar · Equipe' };

async function entrarAction(form: FormData) {
  'use server';
  const u = await entrar(String(form.get('email') || ''), String(form.get('senha') || ''));
  if (!u) redirect('/equipe/entrar?erro=1');
  redirect('/equipe/agenda');
}

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await usuarioAtual()) redirect('/equipe/agenda');
  const { erro } = await searchParams;
  return (
    <main className="login">
      <form className="login-card" action={entrarAction}>
        <span className="brand"><img src="/brand/takeat-logo.svg" alt="Takeat" /><span>Academy · Equipe</span></span>
        <div>
          <h1>Entrar na área da equipe</h1>
          <p>Use o e-mail e a senha do seu convite.</p>
        </div>
        {erro && <div className="login-err" role="alert"><span className="icon">error</span>E-mail ou senha incorretos.</div>}
        <label className="fld"><span>E-mail</span><input className="inp" name="email" type="email" autoComplete="username" required /></label>
        <label className="fld"><span>Senha</span><input className="inp" name="senha" type="password" autoComplete="current-password" required /></label>
        <button className="btn btn-l btn-filled btn-block" type="submit">Entrar</button>
      </form>
    </main>
  );
}
