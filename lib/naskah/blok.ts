import { CMS_URL, SITE_HOST } from "@/lib/situs";

export interface TandaJson {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface NodeJson {
  type: string;
  attrs?: Record<string, unknown>;
  content?: NodeJson[];
  marks?: TandaJson[];
  text?: string;
}

export const JUDUL_MAKS = 120;
export const DEK_MAKS = 200;
export const TAG_MAKS = 5;
export const KATA_MIN = 200;
export const KATA_MAKS = 2500;

export const PENYEDIA = {
  youtube: /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i,
  x: /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[^/]+\/status\/\d+/i,
  instagram: /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels)\/[\w-]+/i,
  threads: /^https?:\/\/(?:www\.)?threads\.(?:com|net)\/@[^/]+\/post\/[\w-]+/i,
  tiktok: /^https?:\/\/(?:www\.)?tiktok\.com\/@[^/]+\/video\/\d+/i,
} as const;

export type Penyedia = keyof typeof PENYEDIA;

export function penyediaEmbed(url: string): Penyedia | null {
  const bersih = url.trim();
  for (const [nama, pola] of Object.entries(PENYEDIA) as [Penyedia, RegExp][]) {
    if (pola.test(bersih)) return nama;
  }
  return null;
}

const DOMAIN_SENDIRI = [SITE_HOST, SITE_HOST.replace(/^www\./, ""), CMS_URL ? new URL(CMS_URL).host : ""].filter(Boolean);

function hostDari(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function urlAman(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u) || u.length > 2048) return null;
  return hostDari(u) ? u : null;
}

export function escapeHtml(teks: string): string {
  return teks
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const NODE_BLOK = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "blockquote",
  "horizontalRule",
  "gambar",
  "embed",
  "blokLain",
]);

const TANDA_BOLEH = new Set(["bold", "italic", "strike", "link"]);

function gambarAman(src: unknown, izinkanData: boolean): boolean {
  if (urlAman(src)) return true;
  return izinkanData && typeof src === "string" && /^data:image\/(webp|jpeg|png);base64,/.test(src) && src.length < 4_000_000;
}

export function validasiDoc(doc: unknown, izinkanData = false): string | null {
  if (!doc || typeof doc !== "object" || (doc as NodeJson).type !== "doc") return "Isi naskah tidak dikenali.";
  const isi = (doc as NodeJson).content ?? [];
  if (!Array.isArray(isi)) return "Isi naskah tidak dikenali.";
  let jumlah = 0;
  const cek = (node: NodeJson, dalam: string | null): string | null => {
    jumlah += 1;
    if (jumlah > 5000) return "Naskah terlalu panjang.";
    if (typeof node.type !== "string") return "Isi naskah tidak dikenali.";
    if (node.type === "text") {
      if (typeof node.text !== "string") return "Isi naskah tidak dikenali.";
      for (const tanda of node.marks ?? []) {
        if (!TANDA_BOLEH.has(tanda.type)) return `Format ${tanda.type} tidak didukung.`;
        if (tanda.type === "link" && !urlAman(tanda.attrs?.href)) return "Ada tautan yang tidak valid.";
      }
      return null;
    }
    if (node.type === "hardBreak") return null;
    if (node.type === "listItem") {
      if (dalam !== "bulletList" && dalam !== "orderedList") return "Struktur daftar tidak valid.";
    } else if (!NODE_BLOK.has(node.type)) {
      return `Blok ${node.type} tidak didukung.`;
    }
    if (node.type === "heading") {
      const level = Number(node.attrs?.level);
      if (level !== 2 && level !== 3) return "Judul bagian hanya boleh H2 atau H3.";
    }
    if (node.type === "blockquote" && node.attrs?.cite !== undefined) {
      if (typeof node.attrs.cite !== "string" || node.attrs.cite.length > 200) return "Sumber kutipan terlalu panjang.";
    }
    if (node.type === "gambar") {
      if (!gambarAman(node.attrs?.src, izinkanData)) return "Ada gambar dengan alamat tidak valid.";
      if (!Number.isInteger(Number(node.attrs?.id)) || Number(node.attrs?.id) <= 0) return "Gambar harus diunggah lewat editor.";
    }
    if (node.type === "embed") {
      const url = urlAman(node.attrs?.url);
      if (!url || !penyediaEmbed(url)) return "Ada sematan dari sumber yang tidak didukung.";
    }
    if (node.type === "blokLain") {
      if (typeof node.attrs?.html !== "string" || node.attrs.html.length > 60000) return "Blok redaksi rusak.";
    }
    for (const anak of node.content ?? []) {
      const salah = cek(anak, node.type);
      if (salah) return salah;
    }
    return null;
  };
  for (const node of isi) {
    const salah = cek(node, "doc");
    if (salah) return salah;
  }
  return null;
}

export function teksDoc(doc: NodeJson): string {
  const bagian: string[] = [];
  const jalan = (node: NodeJson) => {
    if (node.type === "text" && node.text) bagian.push(node.text);
    if (node.type === "blokLain") return;
    for (const anak of node.content ?? []) jalan(anak);
    if (NODE_BLOK.has(node.type) || node.type === "listItem") bagian.push("\n");
  };
  jalan(doc);
  return bagian.join(" ");
}

export function hitungKataDoc(doc: NodeJson): number {
  return teksDoc(doc).split(/\s+/).filter(Boolean).length;
}

function inline(nodes: NodeJson[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      if (node.type !== "text") return "";
      let teks = escapeHtml(node.text ?? "");
      for (const tanda of [...(node.marks ?? [])].reverse()) {
        if (tanda.type === "bold") teks = `<strong>${teks}</strong>`;
        else if (tanda.type === "italic") teks = `<em>${teks}</em>`;
        else if (tanda.type === "strike") teks = `<s>${teks}</s>`;
        else if (tanda.type === "link") {
          const href = urlAman(tanda.attrs?.href);
          if (!href) continue;
          const host = hostDari(href) ?? "";
          const luar = !DOMAIN_SENDIRI.includes(host);
          const rel = luar ? ' rel="nofollow noopener noreferrer" target="_blank"' : "";
          teks = `<a href="${escapeHtml(href)}"${rel}>${teks}</a>`;
        }
      }
      return teks;
    })
    .join("");
}

function daftarItem(nodes: NodeJson[] | undefined): string {
  return (nodes ?? [])
    .filter((n) => n.type === "listItem")
    .map((item) => {
      const isi = (item.content ?? [])
        .map((anak) => {
          if (anak.type === "paragraph") return inline(anak.content);
          if (anak.type === "bulletList") return `<!-- wp:list -->\n<ul class="wp-block-list">${daftarItem(anak.content)}</ul>\n<!-- /wp:list -->`;
          if (anak.type === "orderedList") return `<!-- wp:list {"ordered":true} -->\n<ol class="wp-block-list">${daftarItem(anak.content)}</ol>\n<!-- /wp:list -->`;
          return "";
        })
        .join("");
      return `<!-- wp:list-item -->\n<li>${isi}</li>\n<!-- /wp:list-item -->`;
    })
    .join("\n");
}

function blok(node: NodeJson, altBawaan: string): string {
  switch (node.type) {
    case "paragraph": {
      const isi = inline(node.content);
      if (!isi.trim()) return "";
      return `<!-- wp:paragraph -->\n<p>${isi}</p>\n<!-- /wp:paragraph -->`;
    }
    case "heading": {
      const level = Number(node.attrs?.level) === 3 ? 3 : 2;
      const attrs = level === 2 ? "" : ` {"level":${level}}`;
      return `<!-- wp:heading${attrs} -->\n<h${level} class="wp-block-heading">${inline(node.content)}</h${level}>\n<!-- /wp:heading -->`;
    }
    case "bulletList":
      return `<!-- wp:list -->\n<ul class="wp-block-list">${daftarItem(node.content)}</ul>\n<!-- /wp:list -->`;
    case "orderedList":
      return `<!-- wp:list {"ordered":true} -->\n<ol class="wp-block-list">${daftarItem(node.content)}</ol>\n<!-- /wp:list -->`;
    case "blockquote": {
      const isi = (node.content ?? []).map((n) => blok(n, altBawaan)).filter(Boolean).join("\n\n");
      const cite = String(node.attrs?.cite ?? "").trim();
      const sumber = cite ? `<cite>${escapeHtml(cite)}</cite>` : "";
      return `<!-- wp:quote -->\n<blockquote class="wp-block-quote">${isi}${sumber}</blockquote>\n<!-- /wp:quote -->`;
    }
    case "horizontalRule":
      return `<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->`;
    case "gambar": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const id = Number(node.attrs?.id);
      if (!src || !id) return "";
      const alt = escapeHtml(String(node.attrs?.alt ?? "").trim() || altBawaan);
      const keterangan = String(node.attrs?.caption ?? "").trim();
      const figcaption = keterangan ? `<figcaption class="wp-element-caption">${escapeHtml(keterangan)}</figcaption>` : "";
      return `<!-- wp:image {"id":${id},"sizeSlug":"large","linkDestination":"none"} -->\n<figure class="wp-block-image size-large"><img src="${escapeHtml(src)}" alt="${alt}" class="wp-image-${id}"/>${figcaption}</figure>\n<!-- /wp:image -->`;
    }
    case "embed": {
      const url = urlAman(node.attrs?.url);
      const penyedia = url ? penyediaEmbed(url) : null;
      if (!url || !penyedia) return "";
      if (penyedia === "youtube") {
        return `<!-- wp:embed {"url":"${escapeHtml(url)}","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->\n<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">\n${escapeHtml(url)}\n</div></figure>\n<!-- /wp:embed -->`;
      }
      return `<!-- wp:paragraph -->\n<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>\n<!-- /wp:paragraph -->`;
    }
    case "blokLain":
      return typeof node.attrs?.html === "string" ? node.attrs.html : "";
    default:
      return "";
  }
}

export function keGutenberg(doc: NodeJson, altBawaan = ""): string {
  return (doc.content ?? []).map((n) => blok(n, altBawaan)).filter(Boolean).join("\n\n");
}
