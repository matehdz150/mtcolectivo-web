import type { CSSProperties, MouseEvent, ReactNode } from "react";

export const PAGE_W = 600;
export const PAGE_H = 776;

/**
 * Stand-in for a rendered PDF page (600×776 points). The real app renders the
 * uploaded file with pdf.js into this same box; field coordinates are shared.
 */
export function PdfPage({ page, children, className = "", onClick, style }: { page: number; children?: ReactNode; className?: string; onClick?: (e: MouseEvent<HTMLDivElement>) => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} style={{ width: PAGE_W, height: PAGE_H, ...style }} className={`relative shrink-0 rounded-md bg-white text-[11px] text-ink shadow-float ${className}`}>
      {page === 1 ? <ContractPageOne /> : <RulesPage />}
      {children}
    </div>
  );
}

const Text = ({ x, y, children, bold, size = 11 }: { x: number; y: number; children: ReactNode; bold?: boolean; size?: number }) => (
  <span className="absolute whitespace-nowrap" style={{ left: x, top: y, fontSize: size, fontWeight: bold ? 700 : 400 }}>
    {children}
  </span>
);
const Bar = ({ x, y, w }: { x: number; y: number; w: number }) => <span aria-hidden="true" className="absolute h-1 rounded-sm bg-[#e4e4e6]" style={{ left: x, top: y, width: w }} />;
const Line = ({ x, y, w }: { x: number; y: number; w: number }) => <span aria-hidden="true" className="absolute h-px bg-ink" style={{ left: x, top: y, width: w }} />;

function ContractPageOne() {
  return (
    <>
      <Text x={60} y={56} bold size={13}>
        CONTRATO DE PRESTACIÓN DE SERVICIOS DE TRANSPORTE
      </Text>
      <Text x={380} y={94}>Folio:</Text>
      <Text x={380} y={120}>Fecha:</Text>
      {[480, 460, 470, 300].map((w, i) => (
        <Bar key={i} x={60} y={160 + i * 12} w={w} />
      ))}
      <Text x={60} y={252}>Contratante:</Text>
      <Text x={400} y={252}>Celular:</Text>
      <Bar x={60} y={288} w={480} />
      <Bar x={60} y={300} w={380} />
      <Text x={60} y={324} bold size={12}>
        Datos del servicio
      </Text>
      <Text x={60} y={354}>Fecha del servicio:</Text>
      <Text x={60} y={382}>Salida:</Text>
      <Text x={60} y={410}>Destino:</Text>
      <Text x={60} y={438}>Unidad:</Text>
      <Text x={60} y={472} bold size={12}>
        Importe
      </Text>
      <Text x={60} y={502}>Total:</Text>
      <Text x={250} y={502}>Anticipo:</Text>
      <Text x={420} y={502}>Por liquidar:</Text>
      {[480, 470, 450, 240].map((w, i) => (
        <Bar key={i} x={60} y={548 + i * 12} w={w} />
      ))}
      <Line x={60} y={712} w={200} />
      <Text x={60} y={718}>Firma del cliente</Text>
      <Line x={340} y={712} w={200} />
      <Text x={340} y={718}>MT Colectivo</Text>
    </>
  );
}

function RulesPage() {
  return (
    <>
      <Text x={60} y={56} bold size={13}>
        REGLAMENTO Y CONDICIONES DEL SERVICIO
      </Text>
      {Array.from({ length: 26 }, (_, i) => (
        <Bar key={i} x={60} y={100 + i * 18 + Math.floor(i / 5) * 14} w={[480, 470, 460, 440, 300][i % 5]} />
      ))}
      <Line x={60} y={712} w={200} />
      <Text x={60} y={718}>Firma del cliente</Text>
    </>
  );
}
