import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthField from "../../../components/auth/AuthField";
import AuthShell from "../../../components/auth/AuthShell";
import { Icon } from "../../../components/Icons";
import { AFTER_LOGIN, A_LOGIN as T } from "../../../data/auth";
import { EMAIL_RE, safePath } from "../../../utils/auth";
import { login } from "../auth.service";

// Page Connexion — /login (e-mail + mot de passe). ?from=/chemin ou state.from : retour à la page demandée.
type Errors = { email?: string; password?: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<Errors>({});
  const [fail, setFail] = useState("");
  const [sending, setSending] = useState(false);

  const target = safePath(
    (location.state as { from?: string } | null)?.from ??
      new URLSearchParams(location.search).get("from"),
    AFTER_LOGIN
  );

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    if (!EMAIL_RE.test(email.trim())) e.email = T.errors.email;
    if (!password) e.password = T.errors.password;
    setErr(e);
    setFail("");
    if (Object.keys(e).length) return;

    setSending(true);
    mutate({
      email,
      password,
    });
    setSending(false);
  };

  const { mutate, isError, error } = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate(target, { replace: true });
    },
  });

  return (
    <AuthShell
      title={T.title}
      description={T.meta}
      label={T.label}
      h1={T.h1}
      lead={T.lead}
    >
      <form onSubmit={submit} noValidate className="au-form">
        <header>
          <h2>{T.heading}</h2>
          <p>{T.sub}</p>
        </header>
        <AuthField
          id="email"
          type="email"
          label={T.fields.email}
          value={email}
          autoComplete="email"
          error={err.email}
          disabled={sending}
          onChange={v => {
            setEmail(v);
            setErr(x => ({ ...x, email: undefined }));
          }}
        />
        <AuthField
          id="password"
          type="password"
          label={T.fields.password}
          value={password}
          autoComplete="current-password"
          error={err.password}
          disabled={sending}
          maxLength={128}
          onChange={v => {
            setPassword(v);
            setErr(x => ({ ...x, password: undefined }));
          }}
        />
        <div className="au-row">
          <Link to="/forgot-password" className="au-link">
            {T.forgot}
          </Link>
        </div>
        {isError && (
          <p className="au-err" role="alert">
            {error.message}
          </p>
        )}
        <button type="submit" className="btn btn-red" disabled={sending}>
          {sending ? T.sending : T.submit} <Icon id="arr" />
        </button>
        <p className="au-alt">
          {T.noAccount}{" "}
          <Link to="/register" className="au-link">
            {T.create}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
