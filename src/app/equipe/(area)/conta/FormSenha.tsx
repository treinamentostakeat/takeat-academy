'use client';
import { useActionState, useEffect, useRef } from 'react';
import { toast } from '@/components/equipe/Toast';
import { trocarSenha, type EstadoSenha } from './acoes';

export function FormSenha() {
  const [estado, acao, pend] = useActionState<EstadoSenha, FormData>(trocarSenha, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) { form.current?.reset(); toast('Senha alterada. Use a nova senha no próximo acesso.', 'lock'); }
    else if (estado?.campo) form.current?.querySelector<HTMLInputElement>(`[name="${estado.campo}"]`)?.focus();
  }, [estado]);
  const err = (c: 'atual' | 'nova' | 'confirma') => estado?.campo === c ? <div className="err" id={`e-${c}`}>{estado.erro}</div> : null;
  const inv = (c: string) => estado?.campo === c || undefined;
  return (
    <form ref={form} action={acao} className="ct-form" noValidate>
      <div className="fld">
        <label htmlFor="s-atual">Senha atual</label>
        <input id="s-atual" name="atual" type="password" autoComplete="current-password" required aria-invalid={inv('atual')} aria-describedby={inv('atual') && 'e-atual'} />
        {err('atual')}
      </div>
      <div className="fld">
        <label htmlFor="s-nova">Nova senha</label>
        <input id="s-nova" name="nova" type="password" autoComplete="new-password" minLength={8} required aria-invalid={inv('nova')} aria-describedby={inv('nova') ? 'e-nova' : 's-nova-i'} />
        {err('nova') ?? <div className="info" id="s-nova-i">Mínimo de 8 caracteres.</div>}
      </div>
      <div className="fld">
        <label htmlFor="s-conf">Confirmar nova senha</label>
        <input id="s-conf" name="confirma" type="password" autoComplete="new-password" required aria-invalid={inv('confirma')} aria-describedby={inv('confirma') && 'e-confirma'} />
        {err('confirma')}
      </div>
      {estado?.erro && !estado.campo && <p className="err" role="alert">{estado.erro}</p>}
      <div className="ct-acts"><button type="submit" className="btn btn-l btn-filled" disabled={pend}>{pend ? 'Salvando…' : 'Trocar senha'}</button></div>
    </form>
  );
}
