import Image from "next/image";

import { LoginCard } from "@/components/login/login-card";
import { RouteMap, RouteMapCompact } from "@/components/login/route-map";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";

const MINT_GRADIENT = "bg-[linear-gradient(160deg,var(--mint)_0%,var(--mint-soft)_55%,#f4fbf6_100%)]";

const FEATURES = [
  { title: "Precio al instante", body: "La unidad y la tarifa salen de los pasajeros." },
  { title: "Orden en PDF", body: "Lista para enviar por WhatsApp." },
  { title: "Pagos al día", body: "Anticipos, saldos y proveedores en un lugar." },
];

function Logo({ className }: { className: string }) {
  return (
    <Image
      src="/brand/mtc-logo-compact.png"
      alt="MTC — Consultora en movilidad urbana sostenible"
      width={411}
      height={151}
      priority
      className={`w-auto ${className}`}
    />
  );
}

export default function Home() {
  return (
    <main className="min-h-dvh bg-surface lg:grid lg:grid-cols-2">
      {/* Mobile: mint header with the headline and a small route */}
      <section className={`relative flex h-[332px] flex-col justify-between overflow-hidden rounded-b-[32px] px-5 pb-6 pt-6 lg:hidden ${MINT_GRADIENT}`}>
        <RouteMapCompact />
        <div className="relative flex items-center justify-between">
          <div className="flex h-10 items-center rounded-md bg-surface px-3">
            <Logo className="h-6" />
          </div>
          <a href="#" aria-label="Ayuda" className="flex size-11 items-center justify-center rounded-md bg-surface">
            <Icon name="help" size={18} />
          </a>
        </div>
        <p className="relative text-[44px] font-light leading-[0.98] tracking-[-0.045em]">
          Cotiza,
          <br />
          asigna
          <br />
          <b className="font-semibold">y cobra.</b>
        </p>
      </section>

      {/* Form column */}
      <div className="flex flex-col px-5 pb-8 pt-7 lg:min-h-dvh lg:px-12 lg:pb-9 lg:pt-10 xl:px-[88px]">
        <header className="hidden items-center justify-between lg:flex">
          <Logo className="h-8" />
          <a href="#" className="inline-flex h-10 items-center gap-2 rounded-full bg-canvas px-4 text-[13px] font-semibold hover:bg-card">
            <Icon name="help" size={16} />
            ¿Necesitas ayuda?
          </a>
        </header>

        <div className="flex flex-1 flex-col lg:justify-center lg:py-6">
          <div className="animate-rise-in flex w-full max-w-[480px] flex-col gap-6 lg:gap-8">
            <div className="flex flex-col gap-1.5 lg:gap-3.5">
              <h1 className="text-[28px] font-medium leading-[1.1] tracking-[-0.03em] lg:text-[60px] lg:font-light lg:leading-[1.02] lg:tracking-[-0.045em]">
                <span className="hidden lg:inline">
                  Hola de nuevo,
                  <br />
                  <b className="font-semibold">inicia sesión.</b>
                </span>
                <span className="lg:hidden">Inicia sesión</span>
              </h1>
              <p className="text-sm text-ink-muted lg:text-[17px] lg:leading-normal">
                <span className="hidden lg:inline">Tus órdenes, cotizaciones y pagos te esperan donde los dejaste.</span>
                <span className="lg:hidden">Entra con el correo que te dio tu administrador.</span>
              </p>
            </div>

            <LoginCard />

            <p className="text-center text-[13px] text-ink-muted lg:text-left lg:text-sm lg:leading-normal">
              ¿Aún no tienes cuenta? <b className="font-semibold text-ink">Pide acceso a tu administrador</b>
              <span className="hidden lg:inline"> y te llegará una invitación por correo</span>.
            </p>
          </div>
        </div>

        <footer className="hidden items-center justify-between text-xs text-ink-muted lg:flex">
          <span>© {new Date().getFullYear()} MT Colectivo · Movilidad consciente</span>
          <a href="#" className="hover:text-ink">
            Aviso de privacidad
          </a>
        </footer>
      </div>

      {/* Desktop: mint panel with the headline, the route and what the app does */}
      <div className="hidden p-4 lg:block">
        <aside
          aria-label="Qué puedes hacer en MT Colectivo"
          className={`sticky top-4 flex h-[calc(100dvh-2rem)] min-h-[640px] flex-col justify-between gap-8 overflow-hidden rounded-[32px] p-10 xl:p-12 ${MINT_GRADIENT}`}
        >
          <div className="flex flex-col gap-5">
            <span className="inline-flex h-[30px] items-center self-start rounded-full border-[1.5px] border-ink px-3 text-xs font-semibold">
              Portal de operaciones
            </span>
            <p className="text-[56px] font-light leading-[0.98] tracking-[-0.045em] xl:text-[76px]">
              Cotiza,
              <br />
              asigna <IconTile icon="route" size="lg" className="-translate-y-1.5" />
              <br />
              <b className="font-semibold">y cobra.</b>
            </p>
          </div>

          <div className="w-full max-w-[592px] [@media(max-height:760px)]:hidden">
            <RouteMap />
          </div>

          <ul className="grid grid-cols-3 gap-4 border-t border-ink/12 pt-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex flex-col gap-1">
                <b className="text-sm font-semibold">{f.title}</b>
                <span className="text-xs leading-[1.4] text-ink-secondary">{f.body}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
