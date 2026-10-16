"use client";

import { Node, mergeAttributes, type NodeViewProps } from "@tiptap/core";
import { Blockquote } from "@tiptap/extension-blockquote";
import Image from "next/image";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { penyediaEmbed } from "@/lib/naskah/blok";

const LABEL_PENYEDIA: Record<string, string> = {
  youtube: "YouTube",
  x: "X",
  instagram: "Instagram",
  threads: "Threads",
  tiktok: "TikTok",
};

function GambarView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const src = String(node.attrs.src ?? "");
  const alt = String(node.attrs.alt ?? "");
  const caption = String(node.attrs.caption ?? "");
  return (
    <NodeViewWrapper
      as="figure"
      className={`my-6 border p-3 ${selected ? "border-ink dark:border-paper" : "border-neutral-200 dark:border-neutral-800"}`}
      data-drag-handle
    >
      <Image src={src} alt={alt} width={1600} height={900} unoptimized className="block h-auto max-h-[480px] w-full object-contain" draggable={false} />
      <div className="mt-3 grid gap-2">
        <input
          value={caption}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          placeholder="Keterangan gambar"
          className="h-9 w-full border-0 border-b border-neutral-200 bg-transparent px-0 text-[13px] outline-none focus:border-ink dark:border-neutral-800 dark:focus:border-paper"
        />
        <input
          value={alt}
          onChange={(e) => updateAttributes({ alt: e.target.value })}
          placeholder="Teks alternatif"
          className="h-9 w-full border-0 border-b border-neutral-200 bg-transparent px-0 text-[13px] outline-none focus:border-ink dark:border-neutral-800 dark:focus:border-paper"
        />
        <button
          type="button"
          onClick={deleteNode}
          className="justify-self-start text-[12px] text-neutral-500 underline decoration-dotted underline-offset-4 hover:text-ink dark:hover:text-paper"
        >
          Hapus gambar
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const Gambar = Node.create({
  name: "gambar",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: "" },
      id: { default: 0 },
      alt: { default: "" },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure[data-gambar]",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          return {
            src: e.getAttribute("data-src") ?? "",
            id: Number(e.getAttribute("data-id") ?? 0),
            alt: e.getAttribute("data-alt") ?? "",
            caption: e.getAttribute("data-caption") ?? "",
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ "data-gambar": "" }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(GambarView);
  },
});

function EmbedView({ node, selected, deleteNode }: NodeViewProps) {
  const url = String(node.attrs.url ?? "");
  const penyedia = penyediaEmbed(url);
  return (
    <NodeViewWrapper
      className={`my-6 flex items-center gap-3 border px-4 py-3 ${selected ? "border-ink dark:border-paper" : "border-neutral-200 dark:border-neutral-800"}`}
      data-drag-handle
    >
      <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase dark:bg-neutral-800">
        {penyedia ? LABEL_PENYEDIA[penyedia] : "Sematan"}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-600 dark:text-neutral-400">{url}</span>
      <button
        type="button"
        onClick={deleteNode}
        className="shrink-0 text-[12px] text-neutral-500 underline decoration-dotted underline-offset-4 hover:text-ink dark:hover:text-paper"
      >
        Hapus
      </button>
    </NodeViewWrapper>
  );
}

export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { url: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-embed]",
        getAttrs: (el) => ({ url: (el as HTMLElement).getAttribute("data-embed") ?? "" }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-embed": HTMLAttributes.url })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
});

function BlokLainView({ node, selected }: NodeViewProps) {
  const html = String(node.attrs.html ?? "");
  const nama = /<!--\s*wp:([a-z0-9/-]+)/i.exec(html)?.[1] ?? "html";
  return (
    <NodeViewWrapper
      className={`my-6 border border-dashed px-4 py-3 text-[13px] text-neutral-600 dark:text-neutral-400 ${selected ? "border-ink dark:border-paper" : "border-neutral-200 dark:border-neutral-800"}`}
      contentEditable={false}
    >
      Blok <span className="font-mono text-[12px]">{nama}</span> dari redaksi. Dibiarkan apa adanya, tetap ikut saat
      dikirim ulang.
    </NodeViewWrapper>
  );
}

export const BlokLain = Node.create({
  name: "blokLain",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { html: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-blok-lain]",
        getAttrs: (el) => {
          const mentah = (el as HTMLElement).getAttribute("data-blok-lain") ?? "";
          try {
            return { html: decodeURIComponent(mentah) };
          } catch {
            return { html: mentah };
          }
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-blok-lain": encodeURIComponent(String(HTMLAttributes.html ?? "")) })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(BlokLainView);
  },
});

function KutipanView({ node, updateAttributes }: NodeViewProps) {
  const cite = String(node.attrs.cite ?? "");
  return (
    <NodeViewWrapper as="blockquote" className="naskah-kutipan">
      <NodeViewContent as="div" />
      <input
        value={cite}
        onChange={(e) => updateAttributes({ cite: e.target.value })}
        placeholder="Sumber kutipan"
        contentEditable={false}
        className="mt-2 h-8 w-full border-0 border-b border-neutral-200 bg-transparent px-0 font-sans text-[13px] not-italic text-neutral-600 outline-none placeholder:text-neutral-400 focus:border-ink dark:border-neutral-800 dark:text-neutral-400 dark:focus:border-paper"
      />
    </NodeViewWrapper>
  );
}

export const Kutipan = Blockquote.extend({
  addAttributes() {
    return { cite: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "blockquote",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          const cite = Array.from(e.children).find((c) => c.tagName === "CITE");
          return { cite: cite?.textContent?.trim() ?? "" };
        },
        contentElement: (el) => {
          const salinan = el.cloneNode(true) as HTMLElement;
          Array.from(salinan.children).forEach((c) => {
            if (c.tagName === "CITE") c.remove();
          });
          return salinan;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["blockquote", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(KutipanView);
  },
});
