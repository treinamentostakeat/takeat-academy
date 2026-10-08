import { exigirUsuario } from '@/lib/sessao';
import { iniciais } from '@/lib/formato';
import { Toaster } from '@/components/equipe/Toast';
import { FormSenha } from './FormSenha';
import './conta.css';

export const metadata = { title: 'Minha conta' };

export default async function Conta() {
  const u = await exigirUsuario();
  return (
    <div className="ct">
      <div className="rp-head">
        <div>
          <h1>Minha conta</h1>
          <p>Seus dados de acesso à área da equipe.</p>
        </div>
      </div>
      <div className="ct-grid">
        <section className="mod">
          <div className="mod-h"><div><h2>Você</h2><p>Para mudar nome, e-mail ou cargo, fale com o gestor.</p></div></div>
          <div className="ct-id">
            <span className="av me">{iniciais(u.nome)}</span>
            <div><b>{u.nome}</b><small>{u.email}</small></div>
          </div>
          <dl className="kv">
            <dt>Cargo</dt><dd><span className={`chip ${u.cargo === 'gestor' ? 'chip-red' : 'chip-neutral'}`}>{u.cargo === 'gestor' ? 'Gestor' : 'Instrutor'}</span></dd>
          </dl>
        </section>
        <section className="mod">
          <div className="mod-h"><div><h2>Trocar senha</h2><p>Se você recebeu uma senha provisória, troque por uma só sua.</p></div></div>
          <FormSenha />
        </section>
      </div>
      <Toaster />
    </div>
  );
}
