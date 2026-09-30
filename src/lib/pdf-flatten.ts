"use client";

import { PDFDocument } from "pdf-lib";

import { EDITOR_H, EDITOR_W, type PDFDocumentProxy } from "./pdf";
import type { TemplateField } from "./types";

const DPI = 200;

/**
 * Builds the PDF that orders are printed on. Pages with covered text are drawn
 * to an image with the covers painted over, so the original text is really
 * gone from the file (a rectangle on top would leave it selectable underneath).
 * Pages without covers are copied untouched.
 */
export async function flattenCovered(source: ArrayBuffer, pdf: PDFDocumentProxy, fields: TemplateField[]): Promise<Uint8Array> {
  const covers = fields.filter((f) => f.cover);
  const coveredPages = new Set(covers.map((f) => f.page));
  const original = await PDFDocument.load(source);
  const out = await PDFDocument.create();

  for (let n = 1; n <= original.getPageCount(); n++) {
    if (!coveredPages.has(n)) {
      const [copy] = await out.copyPages(original, [n - 1]);
      out.addPage(copy);
      continue;
    }

    const page = await pdf.getPage(n);
    const points = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: DPI / 72 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la imagen de la página.");
    const kx = canvas.width / EDITOR_W;
    const ky = canvas.height / EDITOR_H;
    for (const f of covers.filter((c) => c.page === n)) {
      ctx.fillStyle = f.cover as string;
      for (const r of f.coverRects?.length ? f.coverRects : [f]) {
        ctx.fillRect(Math.floor(r.x * kx), Math.floor(r.y * ky), Math.ceil(r.w * kx) + 1, Math.ceil(r.h * ky) + 1);
      }
    }

    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.92));
    const image = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const added = out.addPage([points.width, points.height]);
    added.drawImage(image, { x: 0, y: 0, width: points.width, height: points.height });
  }

  return out.save();
}
