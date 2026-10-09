import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../../../components/auth/AuthShell';
import AuthField from '../../../components/auth/AuthField';
import { Icon } from '../../../components/Icons';
import { AFTER_LOGIN, A_LOGIN as T } from '../../../data/auth';
import { AuthError, EMAIL_RE, login, safePath } from '../../../utils/auth';
import track from '../../../utils/track';

// Page Connexion — /connexion (e-mail + mot de passe). ?from=/chemin ou state.from : retour à la page demandée.
type Errors = { email?: string; password?: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<Errors>({});
  const [fail, setFail] = useState('');
  const [sending, setSending] = useState(false);

  const target = safePath(
    (location.state as { from?: string } | null)?.from ?? new URLSearchParams(location.search).get('from'),
    AFTER_LOGIN,
  );

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    if (!EMAIL_RE.test(email.trim())) e.email = T.errors.email;
    if (!password) e.password = T.errors.password;
    setErr(e); setFail('');
    if (Object.keys(e).length) return;

    setSending(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      track('login_success');
      navigate(target, { replace: true });
    } catch (x) {
      const s = x instanceof AuthError ? x.status : 0;
      setFail(s === 401 || s === 400 || s === 422 ? T.errors.credentials : s === 429 ? T.errors.tooMany : T.errors.network);
      setSending(false);
    }
  };

  return (
    <AuthShell title={T.title} description={T.meta} label={T.label} h1={T.h1} lead={T.lead}>
      <form onSubmit={submit} noValidate className="au-form">
        <header>
          <h2>{T.heading}</h2>
          <p>{T.sub}</p>
        </header>
        <AuthField id="email" type="email" label={T.fields.email} value={email} autoComplete="email" error={err.email} disabled={sending}
          onChange={(v) => { setEmail(v); setErr((x) => ({ ...x, email: undefined })); }} />
        <AuthField id="password" type="password" label={T.fields.password} value={password} autoComplete="current-password" error={err.password} disabled={sending} maxLength={128}
          onChange={(v) => { setPassword(v); setErr((x) => ({ ...x, password: undefined })); }} />
        <div className="au-row"><Link to="/mot-de-passe-oublie" className="au-link">{T.forgot}</Link></div>
        {fail && <p className="au-err" role="alert">{fail}</p>}
        <button type="submit" className="btn btn-red" disabled={sending}>{sending ? T.sending : T.submit} <Icon id="arr" /></button>
        <p className="au-alt">{T.noAccount} <Link to="/inscription" className="au-link">{T.create}</Link></p>
      </form>
    </AuthShell>
  );
}
