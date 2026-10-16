import { getWpApiUrl } from "./wp-url";

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent?: number;
}

export interface WpPage {
  id: number;
  slug: string;
  modified: string;
  title: { rendered: string };
  content: { rendered: string };
}

const ENTITAS: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (asli, nama: string) => ENTITAS[nama.toLowerCase()] ?? asli)
    .trim();
}

export async function wpFetch<T>(path: string, revalidate = 300): Promise<T> {
  const base = getWpApiUrl();
  if (!base) throw new Error("WORDPRESS_API_URL belum diisi");
  const res = await fetch(`${base}${path}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`WordPress menolak ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function ambilHalaman(slug: string): Promise<WpPage | null> {
  try {
    const daftar = await wpFetch<WpPage[]>(
      `/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=id,slug,modified,title,content`,
      600
    );
    return daftar[0] ?? null;
  } catch {
    return null;
  }
}
