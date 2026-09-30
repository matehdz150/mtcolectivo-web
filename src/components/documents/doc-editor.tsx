"use client";

import { Extension, EditorContent, useEditor, type Editor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Node, mergeAttributes } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { PmNode } from "@/lib/types";

/* --------------------------------------------------------------- extensions */

/** Full-width colored band, like the green "Estimado(a):" line. */
const Banner = Node.create({
  name: "banner",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML: () => [{ tag: "div[data-banner]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-banner": "" }), 0],
});

/** Tables can hide their borders (used for layout: logo on the left, date on the right). */
const DocTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borders: {
        default: true,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-borders") !== "false",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-borders": String(attrs.borders) }),
      },
    };
  },
});

const MARKER = /^(\/si|#si\s+([a-z_]+)|salto|pagina|paginas)$/;

/** Paints {variables}: green when known, red when mistyped, gray for markers like {salto}. */
const TokenHighlight = Extension.create<{ known: Set<string> }>({
  name: "tokenHighlight",
  addOptions: () => ({ known: new Set<string>() }),
  addProseMirrorPlugins() {
    const known = this.options.known;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              for (const match of node.text.matchAll(/\{([^{}\n]+)\}/g)) {
                const token = match[1].trim();
                const marker = MARKER.exec(token);
                const ok = known.has(token) || (!!marker && (!marker[2] || known.has(marker[2])));
                const from = pos + (match.index ?? 0);
                decorations.push(Decoration.inline(from, from + match[0].length, { class: ok ? (marker ? "doc-marker" : "doc-token") : "doc-token-bad" }));
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

/* ------------------------------------------------------------------ images */

const MAX_IMAGE_CHARS = 220_000;

/** Shrinks the picture so the document stays small enough to save. */
async function prepareImage(file: File): Promise<{ src: string; width: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 640 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let src = canvas.toDataURL("image/png");
  if (src.length > MAX_IMAGE_CHARS) {
    // photos: JPEG is much smaller (transparency is lost, so paint white first)
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    src = canvas.toDataURL("image/jpeg", 0.82);
  }
  if (src.length > MAX_IMAGE_CHARS) throw new Error("too-big");
  return { src, width: Math.min(canvas.width, 280) };
}

/* ----------------------------------------------------------------- toolbar */

const SWATCHES = [
  { name: "Negro", value: "#0f0f12" },
  { name: "Verde", value: "#00843f" },
  { name: "Gris", value: "#5b5b63" },
  { name: "Rojo", value: "#c0392b" },
  { name: "Blanco", value: "#ffffff" },
];

function Tool({ label, title, active, disabled, onClick, children }: { label: string; title?: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] font-semibold transition disabled:opacity-35 ${active ? "bg-ink text-surface" : "bg-surface hover:bg-control"}`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-line" />;

function Toolbar({ editor }: { editor: Editor }) {
  const [imageError, setImageError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const chain = () => editor.chain().focus();
  const inTable = editor.isActive("table");

  async function addImage(file: File | undefined) {
    if (!file) return;
    setImageError("");
    try {
      const { src, width } = await prepareImage(file);
      chain().setImage({ src, width }).run();
    } catch {
      setImageError("No pudimos usar esa imagen: pesa demasiado o no es válida. Prueba con una más pequeña.");
    }
  }

  const insertBlock = (nodes: PmNode[]) => chain().insertContent(nodes).run();
  const para = (text?: string): PmNode => ({ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) });

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-card p-2">
      <div className="flex flex-wrap items-center gap-1">
        <Tool label="Negritas" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
          <b>B</b>
        </Tool>
        <Tool label="Cursiva" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
          <i>I</i>
        </Tool>
        <Tool label="Subrayado" active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
          <u>U</u>
        </Tool>
        <Divider />
        <Tool label="Título grande" title="Título" active={editor.isActive("heading", { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
          T1
        </Tool>
        <Tool label="Subtítulo" active={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          T2
        </Tool>
        <Tool label="Banda de color" title="Banda verde de ancho completo" active={editor.isActive("banner")} onClick={() => chain().toggleNode("banner", "paragraph").run()}>
          Banda
        </Tool>
        <Divider />
        <Tool label="Alinear a la izquierda" active={editor.isActive({ textAlign: "left" })} onClick={() => chain().setTextAlign("left").run()}>
          ⟸
        </Tool>
        <Tool label="Centrar" active={editor.isActive({ textAlign: "center" })} onClick={() => chain().setTextAlign("center").run()}>
          ≡
        </Tool>
        <Tool label="Alinear a la derecha" active={editor.isActive({ textAlign: "right" })} onClick={() => chain().setTextAlign("right").run()}>
          ⟹
        </Tool>
        <Divider />
        <Tool label="Lista con viñetas" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
          •
        </Tool>
        <Tool label="Lista numerada" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
          1.
        </Tool>
        <Tool label="Línea divisoria" onClick={() => chain().setHorizontalRule().run()}>
          ―
        </Tool>
        <Divider />
        <span className="flex items-center gap-1" role="group" aria-label="Color del texto">
          {SWATCHES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-label={`Texto ${s.name.toLowerCase()}`}
              title={s.name}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chain().setColor(s.value).run()}
              className="size-6 rounded-full border border-line"
              style={{ background: s.value }}
            />
          ))}
        </span>
        <Divider />
        <Tool label="Insertar imagen" onClick={() => fileRef.current?.click()}>
          Imagen
        </Tool>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="sr-only" tabIndex={-1} onChange={(e) => { void addImage(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Tool label="Insertar tabla" onClick={() => chain().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run()}>
          Tabla
        </Tool>
        <Tool label="Agregar columna" disabled={!inTable} onClick={() => chain().addColumnAfter().run()}>
          + Col
        </Tool>
        <Tool label="Agregar fila" disabled={!inTable} onClick={() => chain().addRowAfter().run()}>
          + Fila
        </Tool>
        <Tool label="Quitar columna" disabled={!inTable} onClick={() => chain().deleteColumn().run()}>
          − Col
        </Tool>
        <Tool label="Quitar fila" disabled={!inTable} onClick={() => chain().deleteRow().run()}>
          − Fila
        </Tool>
        <Tool label="Mostrar u ocultar bordes de la tabla" disabled={!inTable} onClick={() => chain().updateAttributes("table", { borders: editor.getAttributes("table").borders === false }).run()}>
          Bordes
        </Tool>
        <Tool label="Quitar tabla" disabled={!inTable} onClick={() => chain().deleteTable().run()}>
          Quitar tabla
        </Tool>
        <Divider />
        <Tool label="Salto de página" title="Empieza una página nueva" onClick={() => insertBlock([para("{salto}")])}>
          Salto de página
        </Tool>
        <Tool label="Sección opcional" title="Lo que quede entre las dos marcas solo se imprime si el dato no está vacío" onClick={() => insertBlock([para("{#si itinerario}"), para(), para("{/si}")])}>
          Sección opcional
        </Tool>
      </div>
      {imageError ? (
        <p role="alert" className="px-1 text-xs font-medium text-danger">
          {imageError}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

export interface DocEditorHandle {
  insertText: (text: string) => void;
}

/**
 * Word-like editor for one part of a document (body, header or footer).
 * `knownTokens` are the {variables} that exist; anything else is painted red.
 */
export function DocEditor({ initial, onChange, knownTokens, onHandle }: { initial: PmNode; onChange: (doc: PmNode) => void; knownTokens: string[]; onHandle?: (handle: DocEditorHandle | null) => void }) {
  const [known] = useState(() => new Set<string>());

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Image.configure({ inline: true, allowBase64: true }),
      DocTable.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Banner,
      TokenHighlight.configure({ known }),
    ],
    content: initial,
    editorProps: { attributes: { class: "doc-editor", "aria-label": "Documento", spellcheck: "true", lang: "es" } },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as PmNode),
  });

  // Keep the set in place (the extension holds a reference) and repaint.
  useEffect(() => {
    known.clear();
    knownTokens.forEach((t) => known.add(t));
    editor?.view.dispatch(editor.state.tr);
  }, [knownTokens, known, editor]);

  useEffect(() => {
    if (!editor) return;
    onHandle?.({ insertText: (text) => editor.chain().focus().insertContent(text).run() });
    return () => onHandle?.(null);
  }, [editor, onHandle]);

  if (!editor) return <div className="min-h-[560px] animate-pulse rounded-md bg-card" />;

  return (
    <div className="flex flex-col gap-3">
      <Toolbar editor={editor} />
      <div className="overflow-hidden rounded-md bg-white shadow-float">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
