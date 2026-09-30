"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/misc";
import { signOut, useSession } from "@/lib/auth";
import { SEARCH_EVENT } from "@/lib/mobile-search";
import { useAnimatedClose } from "@/lib/use-animated-close";

const NAV = [
  { href: "/ordenes", label: "Órdenes" },
  { href: "/clientes", label: "Clientes" },
  { href: "/precios", label: "Precios" },
  { href: "/transportes", label: "Transportes" },
  { href: "/documentos", label: "Documentos" },
];

/** The phone's bottom bar: same sections, its own order and icons. */
const TABS = [
  { href: "/ordenes", label: "Órdenes", d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6" },
  { href: "/clientes", label: "Clientes", d: "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1.5a4 4 0 0 0-3-3.9M16 4.2a3.5 3.5 0 0 1 0 6.6" },
  { href: "/transportes", label: "Transportes", d: "M3 16V7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3h3l2 3v3M3 16h2M9 16h7M20 16h1M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
  { href: "/precios", label: "Precios", d: "M12 3v18M16.5 7.5c-.7-1-2.2-1.5-4.5-1.5-2.8 0-4 1.2-4 2.7 0 4 9 1.6 9 5.6 0 1.6-1.4 2.7-4.5 2.7-2.4 0-4-.6-4.8-1.8" },
  { href: "/documentos", label: "Documentos", d: "M4 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" },
];
const SEARCHABLE = ["/ordenes", "/clientes", "/transportes"];

const initialsOf = (email: string) => email.split("@")[0].replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "MT";

/** Header with logo, module pills and the signed-in user. Sends signed-out visitors to the login. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [account, setAccount] = useState(false);
  const [closingAccount, closeAccount] = useAnimatedClose(() => setAccount(false));

  useEffect(() => {
    if (session === null) router.replace("/");
  }, [session, router]);

  if (!session) {
    return (
      <div className="min-h-dvh bg-canvas p-10">
        <Skeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-4 lg:px-10">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/ordenes" aria-label="Inicio" className="flex items-center gap-2.5">
              <Image src="/brand/mtc-logo-compact.png" alt="MTC" width={411} height={151} className="h-[30px] w-auto" priority />            </Link>
            <nav aria-label="Módulos" className="flex gap-1.5 overflow-x-auto max-lg:hidden">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-[34px] shrink-0 items-center rounded-md px-3.5 text-[13px] shadow-row transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                      active ? "bg-ink font-semibold text-surface" : "bg-surface font-medium text-ink-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            {SEARCHABLE.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? (
              <button type="button" aria-label="Buscar" onClick={() => window.dispatchEvent(new Event(SEARCH_EVENT))} className="flex size-11 items-center justify-center rounded-[14px] bg-surface shadow-row">
                <Icon name="search" size={20} />
              </button>
            ) : null}
            <button type="button" aria-label="Cuenta" onClick={() => setAccount(true)} className="flex size-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-surface">
              {initialsOf(session.email)}
            </button>
          </div>
          <div className="hidden items-center gap-2.5 lg:flex">
            <button type="button" aria-label="Ayuda" className="flex size-9 items-center justify-center rounded-md bg-surface shadow-row hover:bg-card">
              <Icon name="help" />
            </button>
            <Link
              href="/ajustes"
              aria-label="Ajustes"
              aria-current={pathname.startsWith("/ajustes") ? "page" : undefined}
              className={`flex size-9 items-center justify-center rounded-md shadow-row transition ${pathname.startsWith("/ajustes") ? "bg-ink text-surface" : "bg-surface hover:bg-card"}`}
            >
              <Icon name="settings" />
            </Link>
            <div className="flex h-10 items-center gap-2.5 rounded-full bg-surface pl-1 pr-3.5 shadow-row">
              <span className="flex size-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-surface">{initialsOf(session.email)}</span>
              <span className="max-w-[200px] truncate text-[13px] font-semibold">{session.email}</span>
            </div>
            <button type="button" onClick={signOut} className="h-9 rounded-md bg-surface px-3 text-[13px] font-semibold shadow-row hover:bg-card">
              Salir
            </button>
          </div>
        </div>
      </header>
      <main key={pathname} className="anim-page mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-5 pb-12 pt-7 max-lg:pb-32 lg:px-10">{children}</main>

      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 px-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        {TABS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${active ? "text-ink" : "text-ink-muted"}`}>
              <span className={`flex h-8 w-14 items-center justify-center rounded-2xl ${active ? "bg-mint" : ""}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={item.d} />
                </svg>
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {account ? (
        <div className={`anim-overlay fixed inset-0 z-50 flex flex-col justify-end bg-ink/40 lg:hidden ${closingAccount ? "is-closing" : ""}`} onClick={closeAccount}>
          <div role="dialog" aria-label="Cuenta" onClick={(e) => e.stopPropagation()} className="anim-sheet flex flex-col gap-[18px] rounded-t-[28px] bg-surface px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3">
            <span className="h-[5px] w-11 self-center rounded-full bg-control-strong" />
            <div className="flex items-center gap-3.5">
              <span className="flex size-14 items-center justify-center rounded-full bg-ink text-lg font-bold text-surface">{initialsOf(session.email)}</span>
              <div className="flex min-w-0 flex-col">
                <span className="text-lg font-bold">Administrador</span>
                <span className="truncate text-sm text-ink-muted">{session.email}</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-[20px] bg-card">
              <Link href="/ajustes" onClick={() => setAccount(false)} className="flex h-[60px] w-full items-center gap-3.5 px-[18px] text-left text-base font-semibold">
                <Icon name="settings" size={22} />
                Ajustes
              </Link>
              <button type="button" className="flex h-[60px] w-full items-center gap-3.5 border-t border-line px-[18px] text-left text-base font-semibold">
                <Icon name="help" size={22} />
                Ayuda
              </button>
              <button type="button" onClick={signOut} className="flex h-[60px] w-full items-center gap-3.5 border-t border-line px-[18px] text-left text-base font-semibold text-danger">
                <Icon name="arrowLeft" size={22} />
                Cerrar sesión
              </button>
            </div>
            <button type="button" onClick={closeAccount} className="h-14 rounded-[18px] bg-ink text-base font-bold text-surface">
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
