import { redirect } from 'next/navigation';
import { inicioDe } from '@/lib/permissoes';
import { entrar, usuarioAtual } from '@/lib/sessao';
import '@/app/equipe/entrar/entrar.css';

/* Tela de login por e-mail e senha, usada na área da equipe e na área interna.
   Depois de entrar, cada cargo vai para a sua área, seja qual for a tela de origem. */

async function entrarAction(rota: string, form: FormData) {
  'use server';
  const u = await entrar(String(form.get('email') || ''), String(form.get('senha') || ''));
  if (!u) redirect(`${rota}?erro=1`);
  redirect(inicioDe(u.cargo));
}

export async function TelaEntrar({ rota, selo, titulo, texto, erro }: { rota: string; selo: string; titulo: string; texto: string; erro?: string }) {
  const u = await usuarioAtual();
  if (u) redirect(inicioDe(u.cargo));
  return (
    <main className="login">
      <form className="login-card" action={entrarAction.bind(null, rota)}>
        <span className="brand"><img src="/brand/takeat-logo.svg" alt="Takeat" /><span>{selo}</span></span>
        <div>
          <h1>{titulo}</h1>
          <p>{texto}</p>
        </div>
        {erro && <div className="login-err" role="alert"><span className="icon">error</span>E-mail ou senha incorretos. Depois de várias tentativas, aguarde 15 minutos.</div>}
        <label className="fld"><span>E-mail</span><input className="inp" name="email" type="email" autoComplete="username" required /></label>
        <label className="fld"><span>Senha</span><input className="inp" name="senha" type="password" autoComplete="current-password" required /></label>
        <button className="btn btn-l btn-filled btn-block" type="submit">Entrar</button>
      </form>
    </main>
  );
}
