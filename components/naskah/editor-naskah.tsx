"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { BlokLain, Embed, Gambar, Kutipan } from "@/components/naskah/ekstensi";
import { adaIsi, bacaLokal, hapusLokal, pindahLokal, tandaiSinkronLokal, tulisLokal } from "@/lib/naskah/lokal";
import {
  DEK_MAKS,
  JUDUL_MAKS,
  KATA_MAKS,
  KATA_MIN,
  hitungKataDoc,
  penyediaEmbed,
  urlAman,
  type NodeJson,
} from "@/lib/naskah/blok";
import { SITE_NAME } from "@/lib/situs";

export interface KategoriPilihan {
  id: number;
  nama: string;
}

export interface GambarUtama {
  id: number;
  src: string;
}

export interface NaskahAwal {
  id: string | null;
  judul: string;
  dek: string;
  kategoriId: number | null;
  gambarUtama: GambarUtama | null;
  isi: NodeJson | null;
  isiHtml: string | null;
  status: "draf" | "revisi";
  wpPostId: number | null;
  catatanRedaksi: string | null;
  diubah: number | null;
}

interface Simpanan {
  judul: string;
  dek: string;
  kategoriId: number | null;
  gambarUtamaId: number | null;
  isi: NodeJson;
}

interface Kumpulan extends Simpanan {
  gambarUtama: GambarUtama | null;
}

function muatan(k: Kumpulan): Simpanan {
  return { judul: k.judul, dek: k.dek, kategoriId: k.kategoriId, gambarUtamaId: k.gambarUtamaId, isi: k.isi };
}

const KOLOM =
  "w-full border-0 border-b border-neutral-200 bg-transparent px-0 text-[15px] text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink dark:border-neutral-800 dark:text-paper dark:focus:border-paper";
const LABEL = "block text-[12px] font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400";
const JEDA_SERVER = 3000;
const JEDA_SERVER_MAKS = 20000;
const JEDA_LOKAL = 300;
const JEDA_ULANG = [5000, 15000, 60000];
const GAMBAR_MAKS_MB = 8;
const GAMBAR_MAKS_BYTE = GAMBAR_MAKS_MB * 1024 * 1024;
const BANTUAN = "mt-1.5 text-[12px] leading-snug text-neutral-500";

function Panah({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function jam(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(d);
}

async function unggah(file: File, untuk: "isi" | "utama"): Promise<{ id: number; src: string }> {
  const form = new FormData();
  form.set("foto", file);
  form.set("untuk", untuk);
  const res = await fetch("/api/akun/gambar/", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { id?: number; src?: string; pesan?: string };
  if (!res.ok || !data.id || !data.src) throw new Error(data.pesan ?? "Gambar gagal diunggah.");
  return { id: data.id, src: data.src };
}

function TombolAlat({
  aktif = false,
  onClick,
  label,
  children,
}: {
  aktif?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={aktif}
      className={`flex h-8 min-w-8 shrink-0 items-center justify-center px-2 text-[13px] whitespace-nowrap transition-colors ${
        aktif
          ? "bg-ink text-paper dark:bg-paper dark:text-ink"
          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

function useBatasHeader(): number {
  const [batas, setBatas] = useState(0);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    let bingkai = 0;
    let jalan = false;
    const ukur = () => setBatas(Math.max(0, Math.round(header.getBoundingClientRect().bottom)));
    const putar = () => {
      ukur();
      if (jalan) bingkai = requestAnimationFrame(putar);
    };
    const mulai = () => {
      if (jalan) return;
      jalan = true;
      bingkai = requestAnimationFrame(putar);
    };
    const henti = () => {
      jalan = false;
      cancelAnimationFrame(bingkai);
      ukur();
    };
    const sekali = () => requestAnimationFrame(ukur);
    ukur();
    const pengamatUkuran = new ResizeObserver(ukur);
    pengamatUkuran.observe(header);
    const pengamatKelas = new MutationObserver(sekali);
    pengamatKelas.observe(header, { attributes: true, attributeFilter: ["class", "style"] });
    header.addEventListener("transitionrun", mulai);
    header.addEventListener("transitionend", henti);
    header.addEventListener("transitioncancel", henti);
    return () => {
      jalan = false;
      cancelAnimationFrame(bingkai);
      pengamatUkuran.disconnect();
      pengamatKelas.disconnect();
      header.removeEventListener("transitionrun", mulai);
      header.removeEventListener("transitionend", henti);
      header.removeEventListener("transitioncancel", henti);
    };
  }, []);
  return batas;
}

function CentangIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

function SilangIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function Bilah({
  editor,
  onGambar,
  onBilah,
}: {
  editor: Editor;
  onGambar: () => void;
  onBilah: (jenis: "tautan" | "embed") => void;
}) {
  const batasHeader = useBatasHeader();
  return (
    <div
      style={{ top: batasHeader }}
      className="sticky z-20 -mx-4 flex items-center gap-0.5 overflow-x-auto contain-inline-size overscroll-x-contain border-b border-neutral-200 bg-paper/95 px-3 py-1.5 backdrop-blur [scrollbar-width:none] dark:border-neutral-800 dark:bg-night/95 [&::-webkit-scrollbar]:hidden"
    >
      <TombolAlat label="Judul bagian" aktif={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </TombolAlat>
      <TombolAlat label="Subjudul" aktif={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        H3
      </TombolAlat>
      <span className="mx-1 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
      <TombolAlat label="Tebal" aktif={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </TombolAlat>
      <TombolAlat label="Miring" aktif={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </TombolAlat>
      <TombolAlat label="Coret" aktif={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </TombolAlat>
      <TombolAlat label="Tautan" aktif={editor.isActive("link")} onClick={() => onBilah("tautan")}>
        Tautan
      </TombolAlat>
      <span className="mx-1 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
      <TombolAlat label="Kutipan" aktif={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <span className="font-serif text-lg leading-none">&ldquo;</span>
      </TombolAlat>
      <TombolAlat label="Daftar" aktif={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •
      </TombolAlat>
      <TombolAlat label="Daftar bernomor" aktif={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1.
      </TombolAlat>
      <TombolAlat label="Pemisah" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        —
      </TombolAlat>
      <span className="mx-1 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
      <TombolAlat label="Gambar" onClick={onGambar}>
        Gambar
      </TombolAlat>
      <TombolAlat label="Sematan" onClick={() => onBilah("embed")}>
        Sematan
      </TombolAlat>
    </div>
  );
}

export function EditorNaskah({
  awal,
  kategori,
  profilSiap,
  reporter = false,
}: {
  awal: NaskahAwal;
  kategori: KategoriPilihan[];
  profilSiap: boolean;
  reporter?: boolean;
}) {
  const router = useRouter();
  const [judul, setJudul] = useState(awal.judul);
  const [dek, setDek] = useState(awal.dek);
  const [kategoriId, setKategoriId] = useState<number | null>(awal.kategoriId);
  const [gambarUtama, setGambarUtama] = useState<GambarUtama | null>(awal.gambarUtama);
  const [kata, setKata] = useState(awal.isi ? hitungKataDoc(awal.isi) : 0);
  const [tersimpan, setTersimpan] = useState<Date | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [salahSimpan, setSalahSimpan] = useState<string | null>(null);
  const [tertunda, setTertunda] = useState(false);
  const [dipulihkan, setDipulihkan] = useState(false);
  const [lokalGagal, setLokalGagal] = useState(false);
  const [bilah, setBilah] = useState<"tautan" | "embed" | null>(null);
  const [bilahNilai, setBilahNilai] = useState("");
  const [unggahSibuk, setUnggahSibuk] = useState<"isi" | "utama" | null>(null);
  const [salahGambar, setSalahGambar] = useState<string | null>(null);
  const [kirimSibuk, setKirimSibuk] = useState(false);
  const [salahKirim, setSalahKirim] = useState<string | null>(null);
  const [setuju, setSetuju] = useState(false);
  const berkasIsi = useRef<HTMLInputElement>(null);
  const berkasUtama = useRef<HTMLInputElement>(null);
  const kotor = useRef(false);
  const idRef = useRef(awal.id);
  const pengatur = useRef<number | null>(null);
  const pengaturLokal = useRef<number | null>(null);
  const pengaturUlang = useRef<number | null>(null);
  const kotorSejak = useRef<number | null>(null);
  const gagalBerturut = useRef(0);
  const terakhir = useRef<string>("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer nofollow" },
        },
      }),
      Placeholder.configure({ placeholder: "Mulai tulis di sini…" }),
      Kutipan,
      Gambar,
      Embed,
      BlokLain,
    ],
    content: awal.isi ?? awal.isiHtml ?? "",
    editorProps: {
      attributes: {
        class:
          "naskah-editor min-h-[420px] px-1 py-4 font-serif text-[18px] leading-[1.7] text-ink outline-none dark:text-paper",
      },
      handlePaste: (view, event) => {
        const teks = event.clipboardData?.getData("text/plain")?.trim() ?? "";
        if (!teks || !penyediaEmbed(teks)) return false;
        const { $from } = view.state.selection;
        if ($from.parent.type.name !== "paragraph" || $from.parent.content.size > 0) return false;
        const node = view.state.schema.nodes.embed.create({ url: teks });
        const tr = view.state.tr.replaceWith($from.before(), $from.after(), node);
        view.dispatch(tr);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      kotor.current = true;
      setKata(hitungKataDoc(e.getJSON() as NodeJson));
      jadwalkanLokal();
      jadwalkanSimpan();
    },
  });

  const kumpulkan = useCallback((): Kumpulan | null => {
    if (!editor) return null;
    return {
      judul: judul.trim().slice(0, JUDUL_MAKS),
      dek: dek.trim().slice(0, DEK_MAKS),
      kategoriId,
      gambarUtamaId: gambarUtama?.id ?? null,
      gambarUtama,
      isi: editor.getJSON() as NodeJson,
    };
  }, [editor, judul, dek, kategoriId, gambarUtama]);

  const kumpulkanRef = useRef(kumpulkan);
  useEffect(() => {
    kumpulkanRef.current = kumpulkan;
  }, [kumpulkan]);

  const simpanLokalSekarang = useCallback(() => {
    const data = kumpulkanRef.current();
    if (!data || !editor) return;
    const ok = tulisLokal(
      idRef.current,
      { judul: data.judul, dek: data.dek, kategoriId: data.kategoriId, gambarUtama: data.gambarUtama, isi: data.isi },
      false
    );
    setLokalGagal(!ok);
  }, [editor]);

  const jadwalkanLokal = useCallback(() => {
    if (pengaturLokal.current) window.clearTimeout(pengaturLokal.current);
    pengaturLokal.current = window.setTimeout(simpanLokalSekarang, JEDA_LOKAL);
  }, [simpanLokalSekarang]);

  const simpanSekarang = useCallback(async (): Promise<string | null> => {
    if (pengatur.current) window.clearTimeout(pengatur.current);
    const data = kumpulkanRef.current();
    if (!data) return idRef.current;
    const serial = JSON.stringify(muatan(data));
    if (serial === terakhir.current && idRef.current) return idRef.current;
    if (!navigator.onLine) {
      setTertunda(true);
      return idRef.current;
    }
    setMenyimpan(true);
    setSalahSimpan(null);
    try {
      const adaId = idRef.current;
      const res = await fetch(adaId ? `/api/akun/naskah/${adaId}/` : "/api/akun/naskah/", {
        method: adaId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: serial,
      });
      const hasil = (await res.json().catch(() => ({}))) as { id?: string; pesan?: string };
      if (!res.ok) {
        if (res.status >= 500) {
          setTertunda(true);
        } else {
          setSalahSimpan(hasil.pesan ?? "Draf gagal disimpan.");
        }
        return idRef.current;
      }
      terakhir.current = serial;
      if (!adaId && hasil.id) {
        pindahLokal(null, hasil.id);
        idRef.current = hasil.id;
        window.history.replaceState(window.history.state, "", `/akun/tulis/${hasil.id}/`);
      }
      tandaiSinkronLokal(idRef.current);
      setTersimpan(new Date());
      setTertunda(false);
      gagalBerturut.current = 0;
      kotorSejak.current = null;
      kotor.current = false;
      return idRef.current;
    } catch {
      setTertunda(true);
      return idRef.current;
    } finally {
      setMenyimpan(false);
    }
  }, []);

  const jadwalkanSimpan = useCallback(() => {
    const kini = Date.now();
    if (kotorSejak.current === null) kotorSejak.current = kini;
    if (pengatur.current) window.clearTimeout(pengatur.current);
    const sisa = Math.max(0, JEDA_SERVER_MAKS - (kini - kotorSejak.current));
    pengatur.current = window.setTimeout(() => {
      void simpanSekarang();
    }, Math.min(JEDA_SERVER, sisa));
  }, [simpanSekarang]);

  useEffect(() => {
    if (!editor) return;
    if (!judul && !dek && !kategoriId && !gambarUtama) return;
    kotor.current = true;
    jadwalkanLokal();
    jadwalkanSimpan();
  }, [judul, dek, kategoriId, gambarUtama, editor, jadwalkanLokal, jadwalkanSimpan]);

  useEffect(() => {
    if (!editor) return;
    const salinan = bacaLokal(awal.id);
    if (!salinan || salinan.sinkron || !adaIsi(salinan.data)) return;
    if (awal.diubah !== null && salinan.waktu <= awal.diubah) {
      hapusLokal(awal.id);
      return;
    }
    const id = requestAnimationFrame(() => {
      setJudul(salinan.data.judul);
      setDek(salinan.data.dek);
      setKategoriId(salinan.data.kategoriId);
      setGambarUtama(salinan.data.gambarUtama);
      editor.commands.setContent(salinan.data.isi, { emitUpdate: false });
      setKata(hitungKataDoc(salinan.data.isi));
      setDipulihkan(true);
      kotor.current = true;
      jadwalkanSimpan();
    });
    return () => cancelAnimationFrame(id);
  }, [editor, awal.id, awal.diubah, jadwalkanSimpan]);

  useEffect(() => {
    if (!tertunda) return;
    const coba = () => {
      if (navigator.onLine) void simpanSekarang();
    };
    const onTampak = () => {
      if (document.visibilityState === "visible") coba();
    };
    window.addEventListener("online", coba);
    document.addEventListener("visibilitychange", onTampak);
    const jeda = JEDA_ULANG[Math.min(gagalBerturut.current, JEDA_ULANG.length - 1)];
    gagalBerturut.current += 1;
    pengaturUlang.current = window.setTimeout(coba, jeda);
    return () => {
      window.removeEventListener("online", coba);
      document.removeEventListener("visibilitychange", onTampak);
      if (pengaturUlang.current) window.clearTimeout(pengaturUlang.current);
    };
  }, [tertunda, menyimpan, simpanSekarang]);

  useEffect(() => {
    const onTutup = (e: BeforeUnloadEvent) => {
      if (kotor.current && lokalGagal) e.preventDefault();
    };
    window.addEventListener("beforeunload", onTutup);
    return () => {
      window.removeEventListener("beforeunload", onTutup);
      if (pengatur.current) window.clearTimeout(pengatur.current);
      if (pengaturLokal.current) window.clearTimeout(pengaturLokal.current);
    };
  }, [lokalGagal]);

  const pasangBilah = () => {
    if (!editor) return;
    const nilai = bilahNilai.trim();
    if (bilah === "tautan") {
      if (!nilai) {
        editor.chain().focus().unsetLink().run();
      } else {
        const url = urlAman(/^https?:\/\//i.test(nilai) ? nilai : `https://${nilai}`);
        if (!url) return;
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }
    } else if (bilah === "embed") {
      const url = urlAman(nilai);
      if (!url || !penyediaEmbed(url)) {
        setSalahKirim("Sematan hanya untuk tautan YouTube, X, Instagram, Threads, atau TikTok.");
        return;
      }
      editor.chain().focus().insertContent({ type: "embed", attrs: { url } }).run();
    }
    setBilah(null);
    setBilahNilai("");
  };

  const pilihGambar = async (file: File, untuk: "isi" | "utama") => {
    setSalahKirim(null);
    setSalahGambar(null);
    if (!navigator.onLine) {
      const pesan = "Unggah gambar butuh koneksi internet.";
      if (untuk === "utama") setSalahGambar(pesan);
      else setSalahKirim(pesan);
      return;
    }
    if (file.size > GAMBAR_MAKS_BYTE) {
      const pesan = `Gambar maksimal ${GAMBAR_MAKS_MB} MB.`;
      if (untuk === "utama") setSalahGambar(pesan);
      else setSalahKirim(pesan);
      return;
    }
    setUnggahSibuk(untuk);
    try {
      const hasil = await unggah(file, untuk);
      if (untuk === "utama") {
        setGambarUtama(hasil);
      } else if (editor) {
        editor.chain().focus().insertContent({ type: "gambar", attrs: { ...hasil, alt: "", caption: "" } }).run();
      }
    } catch (e) {
      const pesan = e instanceof Error ? e.message : "Gambar gagal diunggah.";
      if (untuk === "utama") setSalahGambar(pesan);
      else setSalahKirim(pesan);
    } finally {
      setUnggahSibuk(null);
    }
  };

  const kirim = async () => {
    setSalahKirim(null);
    const data = kumpulkanRef.current();
    if (!data) return;
    if (data.judul.length < 10) return setSalahKirim("Judul minimal 10 karakter.");
    if (!data.kategoriId) return setSalahKirim("Pilih satu kategori.");
    if (kata < KATA_MIN) return setSalahKirim(`Naskah minimal ${KATA_MIN} kata, sekarang ${kata}.`);
    if (kata > KATA_MAKS) return setSalahKirim(`Naskah maksimal ${KATA_MAKS} kata.`);
    if (!setuju && !reporter) return setSalahKirim("Centang dulu persetujuan ketentuan kontributor.");
    if (!navigator.onLine) return setSalahKirim("Kirim ke redaksi butuh koneksi internet.");
    setKirimSibuk(true);
    try {
      const naskahId = await simpanSekarang();
      if (!naskahId || kotor.current) {
        setSalahKirim("Draf belum tersimpan ke server, coba lagi.");
        return;
      }
      const res = await fetch(`/api/akun/naskah/${naskahId}/kirim/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setuju: true }),
      });
      const hasil = (await res.json().catch(() => ({}))) as { pesan?: string };
      if (!res.ok) {
        setSalahKirim(hasil.pesan ?? "Naskah gagal dikirim.");
        return;
      }
      kotor.current = false;
      hapusLokal(naskahId);
      router.push("/akun/?kirim=1");
    } catch {
      setSalahKirim("Jaringan bermasalah. Coba lagi.");
    } finally {
      setKirimSibuk(false);
    }
  };

  const revisi = awal.status === "revisi";

  return (
    <div className="mt-8">
      {revisi && awal.catatanRedaksi && (
        <div className="mb-8 border-l-2 border-ink pl-4 dark:border-paper">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Catatan redaksi</p>
          <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line">{awal.catatanRedaksi}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="naskah-judul" className={LABEL}>Judul</label>
          <input
            id="naskah-judul"
            value={judul}
            maxLength={JUDUL_MAKS}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Judul tulisan"
            className={`${KOLOM} mt-1 py-2.5 font-serif text-[26px] leading-tight font-bold`}
          />
        </div>

        <div>
          <label htmlFor="naskah-dek" className={LABEL}>Ringkasan</label>
          <textarea
            id="naskah-dek"
            value={dek}
            maxLength={DEK_MAKS}
            onChange={(e) => setDek(e.target.value)}
            rows={2}
            placeholder="Satu dua kalimat yang bikin orang mau baca"
            className={`${KOLOM} mt-1 resize-none py-2.5 leading-relaxed`}
          />
          {dek.length >= DEK_MAKS && <p className={BANTUAN}>Maksimal {DEK_MAKS} karakter.</p>}
        </div>

        <div className="sm:max-w-[320px]">
          <label htmlFor="naskah-kategori" className={LABEL}>Kategori</label>
          <div className="relative mt-1">
            <select
              id="naskah-kategori"
              value={kategoriId ?? ""}
              onChange={(e) => setKategoriId(e.target.value ? Number(e.target.value) : null)}
              className={`${KOLOM} h-10 appearance-none pr-7`}
            >
              <option value="">Pilih kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            <Panah className="pointer-events-none absolute top-1/2 right-0 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>
        </div>

        <div>
          <span className={LABEL}>Gambar utama</span>
          <button
            type="button"
            onClick={() => berkasUtama.current?.click()}
            disabled={unggahSibuk !== null}
            aria-label={gambarUtama ? "Ganti gambar utama" : "Pilih gambar utama"}
            className="group relative mt-1.5 flex aspect-video w-full items-center justify-center overflow-hidden border border-neutral-200 bg-neutral-50 text-[13px] text-neutral-500 transition-colors hover:border-ink disabled:cursor-wait dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-paper"
          >
            {gambarUtama ? (
              <>
                <Image
                  src={gambarUtama.src}
                  alt=""
                  width={1200}
                  height={675}
                  unoptimized
                  priority
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute right-3 bottom-3 rounded-full bg-ink/80 px-3 py-1.5 text-[12px] font-semibold text-paper">
                  {unggahSibuk === "utama" ? "Mengunggah…" : "Ganti gambar"}
                </span>
              </>
            ) : (
              <span className="font-medium group-hover:text-ink dark:group-hover:text-paper">
                {unggahSibuk === "utama" ? "Mengunggah…" : "Pilih gambar utama"}
              </span>
            )}
          </button>
          <p className="mt-2 text-[12px] leading-snug text-neutral-400 dark:text-neutral-500">
            Boleh dikosongkan, nanti redaksi yang pilih. Kalau diisi, pakai gambar milik sendiri atau yang bebas lisensi.
          </p>
          {salahGambar && (
            <p role="alert" className="mt-1.5 text-[12px] text-red-700 dark:text-red-400">
              {salahGambar}
            </p>
          )}
          <input
            ref={berkasUtama}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pilihGambar(f, "utama");
              e.target.value = "";
            }}
          />
        </div>

        <div>
          <span className={LABEL}>Isi</span>
          <div className="mt-1.5 border border-neutral-200 px-4 pb-4 dark:border-neutral-800">
            {editor && (
              <Bilah
                editor={editor}
                onGambar={() => berkasIsi.current?.click()}
                onBilah={(jenis) => {
                  setBilah(jenis);
                  setBilahNilai(jenis === "tautan" ? String(editor.getAttributes("link").href ?? "") : "");
                }}
              />
            )}
            {bilah && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  pasangBilah();
                }}
                className="mt-3 flex items-center gap-2"
              >
                <input
                  value={bilahNilai}
                  onChange={(e) => setBilahNilai(e.target.value)}
                  placeholder={bilah === "tautan" ? "https://… (kosongkan untuk melepas tautan)" : "Tempel link di sini"}
                  autoFocus
                  className={`${KOLOM} h-9 text-[13px]`}
                />
                <button
                  type="submit"
                  aria-label="Pasang"
                  title="Pasang"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper dark:bg-paper dark:text-ink"
                >
                  <CentangIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setBilah(null)}
                  aria-label="Batal"
                  title="Batal"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:text-ink dark:hover:text-paper"
                >
                  <SilangIcon className="h-4 w-4" />
                </button>
              </form>
            )}
            <EditorContent editor={editor} />
            {unggahSibuk === "isi" && <p className={BANTUAN}>Mengunggah gambar…</p>}
          </div>
          <div className="mt-1.5 flex items-baseline gap-4 text-[12px]">
            {kata > 0 && kata < KATA_MIN && <span className="text-red-700 dark:text-red-400">{kata} kata</span>}
            <p role="status" className={`ml-auto text-right ${salahSimpan ? "text-red-700 dark:text-red-400" : "text-neutral-500"}`}>
              {salahSimpan
                ? salahSimpan
                : menyimpan
                  ? "Menyimpan draf…"
                  : tertunda
                    ? "Tersimpan di perangkat ini, belum ke server"
                    : tersimpan
                      ? `Draf tersimpan ${jam(tersimpan)}`
                      : dipulihkan
                        ? "Perubahan yang belum terkirim dipulihkan"
                        : null}
            </p>
          </div>
          <input
            ref={berkasIsi}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pilihGambar(f, "isi");
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        {!reporter && (
          <label className="flex items-start gap-2.5 text-[13px] leading-snug text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={setuju}
              onChange={(e) => setSetuju(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-ink dark:accent-paper"
            />
            <span>
              Tulisan ini karya saya sendiri dan saya setuju dengan{" "}
              <Link href="/ketentuan-kontributor/" target="_blank" className="underline decoration-dotted underline-offset-4">
                ketentuan kontributor {SITE_NAME}
              </Link>
              , termasuk bahwa redaksi boleh menyunting dan memutuskan tayang atau tidaknya naskah.
            </span>
          </label>
        )}

        {salahKirim && (
          <p role="alert" className="mt-4 text-[13px] text-red-700 dark:text-red-400">
            {salahKirim}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => void kirim()}
            disabled={!profilSiap || kirimSibuk || unggahSibuk !== null}
            className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] font-semibold text-paper transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200"
          >
            {kirimSibuk ? "Mengirim…" : revisi ? "Kirim ulang ke redaksi" : "Kirim ke redaksi"}
          </button>
          {!profilSiap && (
            <p className="text-[12px] text-neutral-500">
              Lengkapi{" "}
              <Link href="/akun/pengaturan/" className="underline underline-offset-4 hover:text-ink dark:hover:text-paper">
                profil
              </Link>{" "}
              untuk mengirimkan tulisan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
