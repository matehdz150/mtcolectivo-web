"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

const NAV = [
  { href: "/ordenes", label: "Órdenes" },
  { href: "/clientes", label: "Clientes" },
  { href: "/precios", label: "Precios" },
  { href: "/transportes", label: "Transportes" },
  { href: "/documentos", label: "Documentos" },
];

/** Header with logo, module pills and the signed-in user. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-4 lg:px-10">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/ordenes" aria-label="Inicio">
              <Image src="/brand/mtc-logo-compact.png" alt="MTC" width={411} height={151} className="h-[30px] w-auto" priority />
            </Link>
            <nav aria-label="Módulos" className="flex gap-1.5 overflow-x-auto">
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
          <div className="hidden items-center gap-2.5 md:flex">
            <button type="button" aria-label="Ayuda" className="flex size-9 items-center justify-center rounded-md bg-surface shadow-row hover:bg-card">
              <Icon name="help" />
            </button>
            {/* TODO: nombre y rol desde la sesión. */}
            <div className="flex h-10 items-center gap-2.5 rounded-full bg-surface pl-1 pr-3.5 shadow-row">
              <span className="flex size-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-surface">MH</span>
              <span className="text-[13px] font-semibold">Mateo Hernández</span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-5 pb-12 pt-7 lg:px-10">{children}</main>
    </div>
  );
}
