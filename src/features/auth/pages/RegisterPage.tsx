import { useState, type FormEvent } from "react";
import { IconSprite } from "../../../components/Icons";
import "../../../styles/register.css";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setMessage(
      "Les champs sont valides. Reliez cette page au service d’inscription."
    );
  }

  return (
    <main className="register-page">
      <IconSprite />

      <div className="register-glow register-glow-one" aria-hidden="true" />
      <div className="register-glow register-glow-two" aria-hidden="true" />

      <a
        className="register-brand"
        href="/"
        aria-label="Support Connecté, accueil"
      >
        <img
          src="/images/logo-blanc.webp"
          alt="Support Connecté"
          width="150"
          height="47"
        />
      </a>

      <section className="register-card" aria-labelledby="register-title">
        <div className="register-mark" aria-hidden="true">
          <span>SC</span>
          <i />
        </div>

        <p className="register-eyebrow">SUPPORT CONNECTÉ</p>

        <h1 id="register-title">
          Créez votre <span>compte.</span>
        </h1>

        <p className="register-intro">Quelques informations pour commencer.</p>

        <form className="register-form" onSubmit={handleSubmit}>
          <label htmlFor="register-name">Nom complet</label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Votre nom"
            value={name}
            onChange={event => setName(event.target.value)}
            required
          />

          <label htmlFor="register-email">Adresse e-mail</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />

          <label htmlFor="register-password">Mot de passe</label>
          <div className="register-password-wrap">
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="8 caractères minimum"
              minLength={8}
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />

            <button
              type="button"
              className="register-show-password"
              onClick={() => setShowPassword(value => !value)}
              aria-label={
                showPassword
                  ? "Masquer les mots de passe"
                  : "Afficher les mots de passe"
              }
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>

          <label htmlFor="register-confirm-password">
            Confirmer le mot de passe
          </label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Saisissez à nouveau le mot de passe"
            value={confirmPassword}
            onChange={event => {
              setConfirmPassword(event.target.value);
              setMessage("");
            }}
            aria-invalid={passwordMismatch}
            aria-describedby={
              passwordMismatch
                ? "register-password-error"
                : passwordsMatch
                  ? "register-password-success"
                  : undefined
            }
            required
          />

          {passwordMismatch && (
            <p className="register-field-error" id="register-password-error">
              Les mots de passe ne correspondent pas.
            </p>
          )}

          {passwordsMatch && (
            <p
              className="register-field-success"
              id="register-password-success"
            >
              Les mots de passe correspondent.
            </p>
          )}

          <button className="register-submit" type="submit">
            Créer mon compte <span aria-hidden="true">↗</span>
          </button>

          {message && (
            <p className="register-message" role="status">
              {message}
            </p>
          )}
        </form>
      </section>

      <p className="register-footer">
        © {new Date().getFullYear()} Support Connecté
      </p>
    </main>
  );
}
