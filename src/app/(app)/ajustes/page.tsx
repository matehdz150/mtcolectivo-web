"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { useCreateUser, useDeleteUser, useUsers } from "@/lib/queries";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const theme = useTheme();

  return (
    <>
      <PageHeader title="Ajustes" subtitle="La apariencia de la app y quién puede entrar" />

      <Panel className="flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">Tema</h2>
          <p className="text-sm text-ink-muted">{theme === "dark" ? "Oscuro: menos brillo para trabajar de noche." : "Claro: el aspecto de siempre."}</p>
        </div>
        <ThemeSwitch />
      </Panel>

      <Accounts />
    </>
  );
}

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? [err.message, ...(err.details ?? [])].join(" ") : fallback);

function Accounts() {
  const session = useSession();
  const users = useUsers();
  const create = useCreateUser();
  const remove = useDeleteUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState<{ email: string; temporaryPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setCreated(null);
    create.mutate(
      { email: email.trim(), password: password.trim() || undefined },
      {
        onSuccess: (res) => {
          setCreated(res);
          setEmail("");
          setPassword("");
        },
      },
    );
  }

  return (
    <Panel className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-[-0.01em]">Cuentas con acceso</h2>
        <p className="text-sm text-ink-muted">Quien tenga una cuenta puede entrar a la app. Al crearla, le llega un correo con su contraseña temporal; la cambia en su primer acceso.</p>
      </div>

      {users.isPending ? (
        <Skeleton rows={3} />
      ) : users.isError ? (
        <ErrorState message="No pudimos cargar las cuentas." onRetry={() => users.refetch()} />
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg bg-card">
          {users.data.map((u) => {
            const mine = !!session && u.email.toLowerCase() === session.email.toLowerCase();
            return (
              <li key={u.email} className="flex items-center gap-3.5 px-4 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-soft text-sm font-bold text-mint-deep">{u.email.slice(0, 2).toUpperCase()}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">
                    {u.email}
                    {mine ? <span className="ml-2 text-xs font-medium text-ink-muted">(tú)</span> : null}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {u.status === "FORCE_CHANGE_PASSWORD" ? "Pendiente de su primer acceso" : "Activa"}
                    {u.createdAt ? ` · creada el ${shortDate(u.createdAt.slice(0, 10))}` : ""}
                  </span>
                </span>
                {mine ? null : (
                  <Button
                    variant="soft"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => window.confirm(`¿Quitar el acceso de ${u.email}? Ya no podrá entrar a la app.`) && remove.mutate(u.email)}
                  >
                    Quitar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {remove.isError ? <ErrorState message={errorText(remove.error, "No pudimos quitar la cuenta.")} /> : null}

      <form onSubmit={submit} className="flex flex-col gap-3.5 rounded-lg bg-card p-4">
        <span className="text-sm font-semibold">Nueva cuenta</span>
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Correo" type="email" icon="mail" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" autoComplete="off" />
          <TextField
            label="Contraseña temporal (opcional)"
            icon="lock"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Si la dejas vacía, se genera una"
            hint="Mínimo 10 caracteres, con mayúscula, minúscula y número."
            autoComplete="off"
          />
        </div>
        <div className="flex items-center justify-end">
          <Button type="submit" icon="plus" disabled={create.isPending || !email.trim()}>
            {create.isPending ? "Creando…" : "Crear cuenta"}
          </Button>
        </div>
        {create.isError ? <p role="alert" className="text-[13px] font-medium text-danger">{errorText(create.error, "No pudimos crear la cuenta.")}</p> : null}
        {created ? (
          <div role="status" className="flex flex-col gap-2 rounded-lg bg-mint-soft px-4 py-3 text-sm text-ink">
            <span>
              Cuenta creada para <b>{created.email}</b>. Le enviamos la invitación por correo.
            </span>
            {created.temporaryPassword ? (
              <span className="flex flex-wrap items-center gap-2">
                Contraseña temporal:
                <code className="rounded-md bg-surface px-2 py-1 font-mono text-[13px] font-semibold">{created.temporaryPassword}</code>
                <button
                  type="button"
                  className="text-[13px] font-semibold underline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(created.temporaryPassword ?? "");
                    setCopied(true);
                  }}
                >
                  {copied ? "Copiada" : "Copiar"}
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
      </form>
    </Panel>
  );
}
