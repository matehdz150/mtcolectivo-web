"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useState } from "react";

export type { PDFDocumentProxy };

/** The editor places fields on a 600×776 box; pages of any size are mapped onto it. */
export const EDITOR_W = 600;
export const EDITOR_H = 776;

let loader: Promise<typeof import("pdfjs-dist")> | null = null;

/** pdf.js is loaded on demand: it needs a browser and is heavy, so the rest of the app never pays for it. */
function pdfjs() {
  loader ??= import("pdfjs-dist").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return lib;
  });
  return loader;
}

export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const lib = await pdfjs();
  // pdf.js hands the buffer to its worker (detaching it): give it a copy so the caller keeps the bytes.
  return lib.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
}

/**
 * Draws one page into a canvas. Returns a handle so callers can cancel: pdf.js
 * refuses two renders on the same canvas, which happens whenever an effect
 * re-runs (React StrictMode, page changes) before the first render finishes.
 */
export function renderPage(pdf: PDFDocumentProxy, pageNumber: number, canvas: HTMLCanvasElement, targetWidth: number): { done: Promise<void>; cancel: () => void } {
  let cancelled = false;
  let task: { promise: Promise<void>; cancel: () => void } | null = null;

  const done = (async () => {
    const page = await pdf.getPage(pageNumber);
    if (cancelled) return;
    const viewport = page.getViewport({ scale: targetWidth / page.getViewport({ scale: 1 }).width });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    task = page.render({ canvas, viewport });
    try {
      await task.promise;
    } catch (err) {
      if ((err as Error).name !== "RenderingCancelledException") throw err;
    }
  })();

  return {
    done,
    cancel: () => {
      cancelled = true;
      task?.cancel();
    },
  };
}

type Source = Blob | string | null;

export interface OpenedPdf {
  pdf: PDFDocumentProxy | null;
  /** The file's bytes, needed to rebuild the PDF when pages are flattened. */
  bytes: ArrayBuffer | null;
  loading: boolean;
  error: boolean;
}

/** Opens a PDF from a local file or a download link. */
export function usePdf(source: Source): OpenedPdf {
  const [state, setState] = useState<{ source: Source; pdf: PDFDocumentProxy | null; bytes: ArrayBuffer | null; error: boolean }>({ source: null, pdf: null, bytes: null, error: false });

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    (async () => {
      try {
        const data = typeof source === "string" ? await fetch(source).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))) : await source.arrayBuffer();
        const pdf = await openPdf(data);
        if (!cancelled) setState({ source, pdf, bytes: data, error: false });
      } catch {
        if (!cancelled) setState({ source, pdf: null, bytes: null, error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  const settled = state.source === source;
  return { pdf: settled ? state.pdf : null, bytes: settled ? state.bytes : null, loading: !!source && !settled, error: settled && state.error };
}

/* ------------------------------------------------------------- text runs */

/** A piece of text of the original PDF, in editor coordinates. */
export interface TextRun {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Text size in editor points. */
  size: number;
  bold: boolean;
}

interface RawItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

/**
 * The text already printed on a page, as clickable pieces. Neighbouring
 * fragments with the same style are merged ("Dirección de salida" + ":" …).
 */
export async function getTextRuns(pdf: PDFDocumentProxy, pageNumber: number): Promise<TextRun[]> {
  const page = await pdf.getPage(pageNumber);
  const view = page.getViewport({ scale: 1 });
  const sx = EDITOR_W / view.width;
  const sy = EDITOR_H / view.height;

  // Loading the operators makes pdf.js resolve the real font names (needed to spot bold).
  try {
    await page.getOperatorList();
  } catch {
    // fonts stay unresolved: everything counts as regular weight
  }
  const content = await page.getTextContent();

  const isBold = (fontName: string) => {
    try {
      const name = String(page.commonObjs.has(fontName) ? (page.commonObjs.get(fontName) as { name?: string })?.name : "");
      return /bold|black|heavy|semibold|demi/i.test(name);
    } catch {
      return false;
    }
  };

  const items = (content.items as unknown as RawItem[])
    .filter((i) => typeof i.str === "string" && i.str.trim() && i.transform)
    .map((i) => {
      const [a, b, , , e, f] = i.transform;
      const size = Math.hypot(a, b) || i.height || 10;
      return { text: i.str, left: e, baseline: f, width: i.width, size, bold: isBold(i.fontName) };
    })
    // top-to-bottom, then left-to-right
    .sort((p, q) => (Math.abs(p.baseline - q.baseline) < Math.min(p.size, q.size) * 0.4 ? p.left - q.left : q.baseline - p.baseline));

  const merged: typeof items = [];
  for (const item of items) {
    const prev = merged[merged.length - 1];
    const sameLine = prev && Math.abs(prev.baseline - item.baseline) < item.size * 0.35;
    const gap = prev ? item.left - (prev.left + prev.width) : 0;
    if (prev && sameLine && prev.bold === item.bold && Math.abs(prev.size - item.size) < 0.6 && gap < item.size * 0.35) {
      prev.text += (gap > item.size * 0.12 && !prev.text.endsWith(" ") && !item.text.startsWith(" ") ? " " : "") + item.text;
      prev.width = item.left + item.width - prev.left;
    } else merged.push({ ...item });
  }

  return merged.map((m, i) => {
    const top = view.height - (m.baseline + m.size * 0.82);
    return { id: `${pageNumber}-${i}`, text: m.text.trim(), x: m.left * sx, y: top * sy, w: m.width * sx, h: m.size * 1.05 * sy, size: m.size * sy, bold: m.bold };
  });
}

/** Turns selected runs into one block of text: paragraphs are re-wrapped, separate lines keep their breaks. */
export function joinRuns(runs: TextRun[]): { text: string; x: number; y: number; w: number; h: number; size: number; lineHeight?: number; bold: boolean; lineRects: { x: number; y: number; w: number; h: number }[]; indent: number } {
  const sorted = [...runs].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: TextRun[][] = [];
  for (const run of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - run.y) < run.h * 0.5) line.push(run);
    else lines.push([run]);
  }
  lines.forEach((l) => l.sort((a, b) => a.x - b.x));

  const x = Math.min(...runs.map((r) => r.x));
  const y = Math.min(...runs.map((r) => r.y));
  const right = Math.max(...runs.map((r) => r.x + r.w));
  const bottom = Math.max(...runs.map((r) => r.y + r.h));
  const w = right - x;

  // One paragraph = lines that start at the same x and (but the last) reach nearly the full width.
  const aligned = lines.every((l) => Math.abs(l[0].x - x) < 6);
  const full = lines.slice(0, -1).every((l) => l[l.length - 1].x + l[l.length - 1].w > x + w * 0.85);
  const glue = lines.length > 1 && aligned && full ? " " : "\n";

  const sizes = runs.map((r) => r.size).sort((a, b) => a - b);
  const pitches = lines.slice(1).map((l, i) => l[0].y - lines[i][0].y);
  const pitch = pitches.length ? pitches.sort((a, b) => a - b)[Math.floor(pitches.length / 2)] : undefined;

  // Each original line is patched on its own, so a label that shares the first line with the text survives.
  const lineRects = lines.map((l) => {
    const left = Math.min(...l.map((r) => r.x));
    const top = Math.min(...l.map((r) => r.y));
    return { x: left, y: top, w: Math.max(...l.map((r) => r.x + r.w)) - left, h: Math.max(...l.map((r) => r.y + r.h)) - top };
  });
  // The first line starts after a label (hanging paragraph): print it at the same offset.
  const indent = lines.length > 1 ? Math.max(0, lineRects[0].x - x) : 0;

  return {
    lineRects,
    indent: indent > 4 ? Math.round(indent * 10) / 10 : 0,
    text: lines.map((l) => l.map((r) => r.text).join(" ")).join(glue),
    x,
    y,
    w,
    h: bottom - y,
    size: Math.round(sizes[Math.floor(sizes.length / 2)] * 10) / 10,
    lineHeight: pitch ? Math.round(pitch * 10) / 10 : undefined,
    bold: runs.every((r) => r.bold),
  };
}

/** The background color around a box (most common of a ring of pixels just outside it), as #rrggbb. */
export function sampleBackground(canvas: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "#ffffff";
  const kx = canvas.width / EDITOR_W;
  const ky = canvas.height / EDITOR_H;
  const pad = 3;
  const xs = [box.x - pad, box.x + box.w / 2, box.x + box.w + pad];
  const ys = [box.y - pad, box.y + box.h / 2, box.y + box.h + pad];
  const counts = new Map<string, { n: number; rgb: number[] }>();
  for (const px of xs) {
    for (const py of ys) {
      if (px === box.x + box.w / 2 && py === box.y + box.h / 2) continue;
      const x = Math.min(canvas.width - 1, Math.max(0, Math.round(px * kx)));
      const y = Math.min(canvas.height - 1, Math.max(0, Math.round(py * ky)));
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const hit = counts.get(key) ?? { n: 0, rgb: [r, g, b] };
      hit.n++;
      counts.set(key, hit);
    }
  }
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  return best ? `#${best.rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}` : "#ffffff";
}

/**
 * The color the original text was printed in: the pixels of the box that stand
 * out most from the background. Returns undefined for near-black (the default).
 */
export function sampleTextColor(canvas: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }, background: string): string | undefined {
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const kx = canvas.width / EDITOR_W;
  const ky = canvas.height / EDITOR_H;
  const x = Math.max(0, Math.floor(box.x * kx));
  const y = Math.max(0, Math.floor(box.y * ky));
  const w = Math.max(1, Math.min(canvas.width - x, Math.ceil(box.w * kx)));
  const h = Math.max(1, Math.min(canvas.height - y, Math.ceil(box.h * ky)));
  const data = ctx.getImageData(x, y, w, h).data;
  const bg = [1, 3, 5].map((i) => parseInt(background.slice(i, i + 2), 16));
  const distance = (r: number, g: number, b: number, to: number[]) => Math.hypot(r - to[0], g - to[1], b - to[2]);

  const far: number[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (distance(data[i], data[i + 1], data[i + 2], bg) > 140) far.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (far.length < 12) return undefined;
  // the most extreme pixels are the core of the strokes; antialiasing sits in between
  far.sort((a, b) => distance(b[0], b[1], b[2], bg) - distance(a[0], a[1], a[2], bg));
  const core = far.slice(0, Math.max(6, Math.floor(far.length * 0.25)));
  const avg = [0, 1, 2].map((c) => Math.round(core.reduce((s, p) => s + p[c], 0) / core.length));
  if (distance(avg[0], avg[1], avg[2], [15, 15, 18]) < 70) return undefined;
  return `#${avg.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
