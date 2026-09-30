"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";

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

/**
 * Login form. When this device remembers the last account, it shows that
 * account as a card so the user only types the password.
 */
export function LoginCard() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [switchedAccount, setSwitchedAccount] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  const lastAccount = useSyncExternalStore(subscribe, readLastAccount, () => null);
  const remembered = switchedAccount ? null : lastAccount;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = remembered ?? String(new FormData(event.currentTarget).get("email") ?? "").trim();
    try {
      if (keepSession && email) window.localStorage.setItem(LAST_ACCOUNT_KEY, email);
      else window.localStorage.removeItem(LAST_ACCOUNT_KEY);
    } catch {
      // Ignore: remembering the account is a convenience.
    }
    // TODO: autenticar contra el backend antes de entrar.
    router.push("/ordenes");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      {remembered ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Cuenta</span>
          <div className="flex h-[72px] items-center gap-3.5 rounded-lg bg-canvas pl-3.5 pr-3 shadow-[inset_0_0_0_1px_var(--line)]">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-[15px] font-semibold uppercase text-surface">
              {remembered.slice(0, 2)}
            </span>
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
        <TextField
          size="lg"
          label="Correo electrónico"
          name="email"
          type="email"
          icon="mail"
          autoComplete="email"
          required
          placeholder="nombre@mtcolectivo.mx"
        />
      )}

      <TextField
        size="lg"
        label="Contraseña"
        name="password"
        type={showPassword ? "text" : "password"}
        icon="lock"
        autoComplete="current-password"
        required
        placeholder="Escribe tu contraseña"
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="flex size-10 shrink-0 items-center justify-center rounded-md text-ink-muted transition hover:bg-control hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
          </button>
        }
      />

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-secondary">
          <input
            type="checkbox"
            checked={keepSession}
            onChange={(e) => setKeepSession(e.target.checked)}
            className="size-[18px] accent-ink"
          />
          <span className="lg:hidden">Recordarme</span>
          <span className="hidden lg:inline">Mantener sesión iniciada</span>
        </label>
        <a href="#" className="py-1 text-sm font-semibold hover:text-ink-secondary">
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <div className="flex flex-col gap-3 pt-1.5">
        <Button type="submit" size="lg" block iconRight="arrowRight">
          Entrar
        </Button>
        <div className="hidden flex-col gap-3 lg:flex">
          <div className="flex items-center gap-3 text-[13px] text-ink-muted">
            <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
          </div>
          {/* TODO: acceso con enlace mágico cuando el backend lo soporte. */}
          <Button variant="soft" size="lg" block icon="mail">
            Enviarme un enlace de acceso
          </Button>
        </div>
      </div>
    </form>
  );
}
