"use client";

import { useCallback, useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react";

import { renderPage, type PDFDocumentProxy } from "@/lib/pdf";

export const PAGE_W = 600;
export const PAGE_H = 776;

/**
 * One page of the uploaded PDF drawn into a 600×776 box. Field coordinates
 * use this same box (the API maps it onto the real page size), so what is
 * placed here lands in the same spot on the generated document.
 */
export function PdfPage({ pdf, page, children, className = "", onClick, style, onCanvas, onPointerDown, onPointerMove, onPointerUp }: { pdf: PDFDocumentProxy | null; page: number; children?: ReactNode; className?: string; onClick?: (e: MouseEvent<HTMLDivElement>) => void; style?: CSSProperties; onCanvas?: (canvas: HTMLCanvasElement | null) => void; onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void; onPointerMove?: (e: PointerEvent<HTMLDivElement>) => void; onPointerUp?: (e: PointerEvent<HTMLDivElement>) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Stable identity: a new ref callback every render would detach and reattach the canvas each time.
  const setCanvas = useCallback(
    (el: HTMLCanvasElement | null) => {
      canvasRef.current = el;
      onCanvas?.(el);
    },
    [onCanvas],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;
    const render = renderPage(pdf, page, canvas, PAGE_W * 2);
    render.done.catch((err) => {
      console.error("No se pudo dibujar la página del PDF", err);
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    });
    return render.cancel;
  }, [pdf, page]);

  return (
    <div onClick={onClick} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} style={{ width: PAGE_W, height: PAGE_H, ...style }} className={`relative shrink-0 rounded-md bg-white text-[11px] text-ink shadow-float ${className}`}>
      <canvas ref={setCanvas} aria-hidden="true" className="absolute inset-0 size-full rounded-md" />
      {!pdf ? <span className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">Cargando PDF…</span> : null}
      {children}
    </div>
  );
}
