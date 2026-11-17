'use client';
import { useActionState } from 'react';
import { criarSenhaPeloLink, type EstadoAcesso } from './acoes';

export function FormAcesso({ token, email }: { token: string; email: string }) {
  const [estado, acao, pend] = useActionState<EstadoAcesso, FormData>(criarSenhaPeloLink.bind(null, token), null);
  const inv = (c: string) => estado?.campo === c || undefined;
  return (
    <form action={acao} className="ct-form" noValidate>
      {/* Ajuda o gerenciador de senhas a salvar a senha com o e-mail certo */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <div className="fld">
        <label htmlFor="a-nova">Crie sua senha</label>
        <input id="a-nova" name="nova" type="password" autoComplete="new-password" minLength={8} required autoFocus aria-invalid={inv('nova')} aria-describedby={inv('nova') ? 'e-nova' : 'a-nova-i'} />
        {estado?.campo === 'nova' ? <div className="err" id="e-nova">{estado.erro}</div> : <div className="info" id="a-nova-i">Mínimo de 8 caracteres.</div>}
      </div>
      <div className="fld">
        <label htmlFor="a-conf">Confirme a senha</label>
        <input id="a-conf" name="confirma" type="password" autoComplete="new-password" required aria-invalid={inv('confirma')} aria-describedby={inv('confirma') ? 'e-confirma' : undefined} />
        {estado?.campo === 'confirma' && <div className="err" id="e-confirma">{estado.erro}</div>}
      </div>
      {estado?.erro && !estado.campo && <p className="err" role="alert">{estado.erro}</p>}
      <div className="ct-acts"><button type="submit" className="btn btn-l btn-filled" disabled={pend}>{pend ? 'Entrando…' : 'Criar senha e entrar'}</button></div>
    </form>
  );
}
