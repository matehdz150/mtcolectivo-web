"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { AuthError, confirmPasswordReset, requestPasswordReset, setNewPassword, signIn, useSession } from "@/lib/auth";

const LAST_ACCOUNT_KEY = "mtc:last-account";

function readLastAccount() {
  try {
    return window.localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    // Storage unavailable (private mode): fall back to the email field.
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

type Mode = "login" | "new-password" | "forgot" | "reset";

/**
 * Login form. When this device remembers the last account, it shows that
 * account as a card so the user only types the password. Also covers the
 * first sign-in (temporary password → choose your own) and password reset.
 */
export function LoginCard() {
  const router = useRouter();
  const session = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [switchedAccount, setSwitchedAccount] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState("");
  const lastAccount = useSyncExternalStore(subscribe, readLastAccount, () => null);
  const remembered = switchedAccount ? null : lastAccount;

  useEffect(() => {
    if (session) router.replace("/ordenes");
  }, [session, router]);

  function remember(address: string) {
    try {
      if (keepSession && address) window.localStorage.setItem(LAST_ACCOUNT_KEY, address);
      else window.localStorage.removeItem(LAST_ACCOUNT_KEY);
    } catch {
      // Ignore: remembering the account is a convenience.
    }
  }

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Algo salió mal. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "");
    const address = (mode === "login" ? (remembered ?? field("email")) : email).trim();

    if (mode === "login") {
      void run(async () => {
        const result = await signIn(address, field("password"), keepSession);
        remember(address);
        setEmail(address);
        if (result.status === "new-password") {
          setChallenge(result.challengeSession);
          setMode("new-password");
        }
        // signed-in: the session effect above redirects
      });
    } else if (mode === "new-password") {
      if (field("password") !== field("confirm")) return setError("Las contraseñas no coinciden.");
      void run(() => setNewPassword(address, field("password"), challenge, keepSession));
    } else if (mode === "forgot") {
      const target = (remembered ?? field("email")).trim();
      void run(async () => {
        await requestPasswordReset(target);
        setEmail(target);
        setNotice("Te enviamos un código por correo.");
        setMode("reset");
      });
    } else {
      void run(async () => {
        await confirmPasswordReset(address, field("code").trim(), field("password"));
        setNotice("Contraseña actualizada. Ya puedes entrar.");
        setMode("login");
      });
    }
  }

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
      className="flex size-10 shrink-0 items-center justify-center rounded-md text-ink-muted transition hover:bg-control hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
    </button>
  );
  const passwordType = showPassword ? "text" : "password";

  const accountField = remembered ? (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">Cuenta</span>
      <div className="flex h-[72px] items-center gap-3.5 rounded-lg bg-canvas pl-3.5 pr-3 shadow-[inset_0_0_0_1px_var(--line)]">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-[15px] font-semibold uppercase text-surface">{remembered.slice(0, 2)}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate text-base font-semibold">{remembered}</b>
          <span className="text-sm text-ink-muted">Última sesión en este equipo</span>
        </span>
        <Button variant="secondary" size="sm" onClick={() => setSwitchedAccount(true)}>
          Cambiar
        </Button>
      </div>
    </div>
  ) : (
    <TextField size="lg" label="Correo electrónico" name="email" type="email" icon="mail" autoComplete="email" required placeholder="nombre@mtcolectivo.mx" />
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      {notice && mode === "login" ? (
        <p role="status" className="rounded-md bg-mint-soft px-3.5 py-2.5 text-sm font-medium text-on-mint">
          {notice}
        </p>
      ) : null}

      {mode === "login" ? (
        <>
          {accountField}
          <TextField
            size="lg"
            label="Contraseña"
            name="password"
            type={passwordType}
            icon="lock"
            autoComplete="current-password"
            required
            placeholder="Escribe tu contraseña"
            trailing={passwordToggle}
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-secondary">
              <input type="checkbox" checked={keepSession} onChange={(e) => setKeepSession(e.target.checked)} className="size-[18px] accent-ink" />
              <span className="lg:hidden">Recordarme</span>
              <span className="hidden lg:inline">Mantener sesión iniciada</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError("");
                setNotice("");
              }}
              className="py-1 text-sm font-semibold hover:text-ink-secondary"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </>
      ) : null}

      {mode === "new-password" ? (
        <>
          <p className="text-sm text-ink-muted">Es tu primer acceso. Elige la contraseña que usarás de ahora en adelante.</p>
          <TextField size="lg" label="Nueva contraseña" name="password" type={passwordType} icon="lock" autoComplete="new-password" required minLength={10} hint="Mínimo 10 caracteres, con mayúscula, minúscula y número." trailing={passwordToggle} />
          <TextField size="lg" label="Repite la contraseña" name="confirm" type={passwordType} icon="lock" autoComplete="new-password" required />
        </>
      ) : null}

      {mode === "forgot" ? (
        <>
          <p className="text-sm text-ink-muted">Escribe tu correo y te enviamos un código para elegir una contraseña nueva.</p>
          {accountField}
        </>
      ) : null}

      {mode === "reset" ? (
        <>
          <p role="status" className="rounded-md bg-mint-soft px-3.5 py-2.5 text-sm font-medium text-on-mint">
            {notice}
          </p>
          <TextField size="lg" label="Código del correo" name="code" inputMode="numeric" autoComplete="one-time-code" required />
          <TextField size="lg" label="Nueva contraseña" name="password" type={passwordType} icon="lock" autoComplete="new-password" required minLength={10} hint="Mínimo 10 caracteres, con mayúscula, minúscula y número." trailing={passwordToggle} />
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-1.5">
        <Button type="submit" size="lg" block iconRight="arrowRight" disabled={pending}>
          {pending ? "Un momento…" : { login: "Entrar", "new-password": "Guardar y entrar", forgot: "Enviarme el código", reset: "Cambiar contraseña" }[mode]}
        </Button>
        {mode !== "login" ? (
          <Button
            variant="soft"
            size="lg"
            block
            onClick={() => {
              setMode("login");
              setError("");
              setNotice("");
            }}
          >
            Volver a iniciar sesión
          </Button>
        ) : null}
      </div>
    </form>
  );
}
