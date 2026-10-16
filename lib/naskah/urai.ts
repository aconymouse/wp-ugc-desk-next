interface Blok {
  nama: string;
  attrs: Record<string, unknown>;
  mulai: number;
  akhir: number;
  isiMulai: number;
  isiAkhir: number;
}

const KOMENTAR = /<!--\s*(\/?)wp:([a-z0-9-]+(?:\/[a-z0-9-]+)?)(\s+\{[\s\S]*?\})?\s*(\/?)-->/g;

function uraiAttrs(mentah: string | undefined): Record<string, unknown> {
  if (!mentah) return {};
  try {
    const nilai = JSON.parse(mentah.trim());
    return nilai && typeof nilai === "object" ? (nilai as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function namaPenuh(nama: string): string {
  return nama.includes("/") ? nama : `core/${nama}`;
}

export function blokTingkatAtas(html: string): Blok[] {
  const hasil: Blok[] = [];
  const tumpukan: Blok[] = [];
  let m: RegExpExecArray | null;
  KOMENTAR.lastIndex = 0;
  while ((m = KOMENTAR.exec(html))) {
    const tutup = m[1] === "/";
    const mandiri = m[4] === "/";
    const nama = namaPenuh(m[2]);
    if (!tutup) {
      const blok: Blok = {
        nama,
        attrs: uraiAttrs(m[3]),
        mulai: m.index,
        akhir: m.index + m[0].length,
        isiMulai: m.index + m[0].length,
        isiAkhir: m.index + m[0].length,
      };
      if (mandiri) {
        if (!tumpukan.length) hasil.push(blok);
        continue;
      }
      tumpukan.push(blok);
      continue;
    }
    for (let i = tumpukan.length - 1; i >= 0; i -= 1) {
      if (tumpukan[i].nama === nama) {
        const blok = tumpukan[i];
        blok.isiAkhir = m.index;
        blok.akhir = m.index + m[0].length;
        tumpukan.length = i;
        if (!tumpukan.length) hasil.push(blok);
        break;
      }
    }
  }
  return hasil;
}

function tanpaKomentar(html: string): string {
  return html.replace(KOMENTAR, "");
}

function ambilAtribut(tag: string, nama: string): string {
  const m = new RegExp(`\\s${nama}=(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? "") : "";
}

function decodeEntitas(teks: string): string {
  return teks
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function blokLain(mentah: string): string {
  return `<div data-blok-lain="${encodeURIComponent(mentah)}"></div>`;
}

function ubahBlok(html: string, blok: Blok): string {
  const isi = html.slice(blok.isiMulai, blok.isiAkhir);
  const mentah = html.slice(blok.mulai, blok.akhir);
  switch (blok.nama) {
    case "core/paragraph":
      return tanpaKomentar(isi);
    case "core/heading": {
      const level = Number(blok.attrs.level ?? 2) <= 2 ? 2 : 3;
      const dalam = tanpaKomentar(isi).replace(/^\s*<h[1-6][^>]*>/i, "").replace(/<\/h[1-6]>\s*$/i, "");
      return `<h${level}>${dalam}</h${level}>`;
    }
    case "core/list":
    case "core/quote":
      return tanpaKomentar(isi);
    case "core/separator":
      return "<hr>";
    case "core/image": {
      const img = /<img\b[^>]*>/i.exec(isi)?.[0] ?? "";
      const src = ambilAtribut(img, "src");
      const alt = ambilAtribut(img, "alt");
      const id = Number(blok.attrs.id ?? 0) || Number(/wp-image-(\d+)/.exec(img)?.[1] ?? 0);
      const caption = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(isi)?.[1] ?? "";
      if (!src || !id) return blokLain(mentah);
      return `<figure data-gambar data-id="${id}" data-src="${src}" data-alt="${alt}" data-caption="${caption.replace(/<[^>]+>/g, "").replace(/"/g, "&quot;")}"></figure>`;
    }
    case "core/embed": {
      const url = typeof blok.attrs.url === "string" ? blok.attrs.url : tanpaKomentar(isi).replace(/<[^>]+>/g, "").trim();
      return url ? `<div data-embed="${decodeEntitas(url).replace(/"/g, "&quot;")}"></div>` : blokLain(mentah);
    }
    default:
      return blokLain(mentah);
  }
}

export function uraiGutenberg(html: string): string {
  const daftar = blokTingkatAtas(html);
  if (!daftar.length) {
    return html.trim() ? blokLain(html) : "";
  }
  const bagian: string[] = [];
  let posisi = 0;
  for (const blok of daftar) {
    const sela = html.slice(posisi, blok.mulai);
    if (sela.trim()) bagian.push(blokLain(sela));
    bagian.push(ubahBlok(html, blok));
    posisi = blok.akhir;
  }
  const sisa = html.slice(posisi);
  if (sisa.trim()) bagian.push(blokLain(sisa));
  return bagian.join("\n");
}
