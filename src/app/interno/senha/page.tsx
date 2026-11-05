import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormSenha } from '@/app/equipe/(area)/conta/FormSenha';
import { Toaster } from '@/components/equipe/Toast';
import { inicioDe } from '@/lib/permissoes';
import { usuarioAtual } from '@/lib/sessao';
import '@/app/equipe/(area)/conta/conta.css';
import '@/app/equipe/entrar/entrar.css';

export const metadata = { title: 'Trocar senha' };

/* Fora do layout da área interna: quem tem senha provisória fica aqui até criar a própria. */
export default async function TrocarSenha() {
  const u = await usuarioAtual();
  if (!u) redirect('/interno/entrar');
  return (
    <main className="login ct">
      <div className="login-card">
        <span className="brand"><img src="/brand/takeat-logo.svg" alt="Takeat" /><span>Academy</span></span>
        <div>
          <h1>{u.trocarSenha ? 'Crie sua senha' : 'Trocar senha'}</h1>
          <p>{u.trocarSenha ? `Olá, ${u.nome.split(' ')[0]}. Para continuar, troque a senha provisória por uma só sua.` : 'Escolha uma nova senha para a sua conta.'}</p>
        </div>
        <FormSenha obrigatoria={u.trocarSenha} />
        {!u.trocarSenha && <Link className="linkbtn" href={inicioDe(u.cargo)}>Voltar</Link>}
      </div>
      <Toaster />
    </main>
  );
}
