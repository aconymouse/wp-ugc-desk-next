import { notFound, redirect } from "next/navigation";
import { EditorNaskah, type KategoriPilihan, type NaskahAwal } from "@/components/naskah/editor-naskah";
import { ambilMediaSrc, ambilNaskahCms } from "@/lib/akun/cms";
import { WP_OFF } from "@/lib/akun/env";
import { bisaMenulis, penulisRedaksi } from "@/lib/akun/peran";
import { ambilSesi, siapKirim, type Sesi } from "@/lib/akun/sesi";
import { wpFetch, type WpCategory } from "@/lib/wp";
import { ambilNaskah, bacaIsi, isiMasihDariCms, naskahUntukRevisi } from "@/lib/naskah/simpan";
import { uraiGutenberg } from "@/lib/naskah/urai";

const KATEGORI_DISEMBUNYIKAN = new Set(["uncategorized", "tak-berkategori"]);

async function daftarKategori(): Promise<KategoriPilihan[]> {
  if (WP_OFF) {
    return [
      { id: 1, nama: "Politik" },
      { id: 2, nama: "Ekbis" },
      { id: 3, nama: "Hype" },
    ];
  }
  try {
    const daftar = await wpFetch<WpCategory[]>(
      "/wp/v2/categories?per_page=100&orderby=count&order=desc&hide_empty=true&_fields=id,name,slug",
      3600
    );
    return daftar
      .filter((k) => !KATEGORI_DISEMBUNYIKAN.has(k.slug))
      .map((k) => ({ id: k.id, nama: k.name }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  } catch {
    return [];
  }
}

async function pastikanBoleh(): Promise<Sesi> {
  const sesi = await ambilSesi();
  if (!sesi) redirect("/?masuk=1&lanjut=%2Fakun%2Ftulis%2F");
  if (!bisaMenulis(sesi.peran)) redirect("/akun/");
  if (sesi.peran === "kontributor" && !sesi.user.profilLengkap) redirect("/akun/pengaturan/");
  return sesi;
}

export async function HalamanTulis({ id }: { id?: string }) {
  const sesi = await pastikanBoleh();
  const kategori = await daftarKategori();

  if (!id) {
    const awal: NaskahAwal = {
      id: null,
      judul: "",
      dek: "",
      kategoriId: null,
      gambarUtama: null,
      isi: null,
      isiHtml: null,
      status: "draf",
      wpPostId: null,
      catatanRedaksi: null,
      diubah: null,
    };
    return <Kerangka judul="Tulisan baru"><EditorNaskah awal={awal} kategori={kategori} profilSiap={siapKirim(sesi)} reporter={penulisRedaksi(sesi.peran)} /></Kerangka>;
  }

  if (id.startsWith("wp-")) {
    const wpPostId = Number(id.slice(3));
    if (!wpPostId || !sesi.wpUserId) notFound();
    let isi;
    try {
      isi = await ambilNaskahCms(wpPostId, sesi.wpUserId);
    } catch {
      notFound();
    }
    if (isi.status !== "draft" || isi.keputusan !== "revisi") redirect("/akun/");
    const naskahId = await naskahUntukRevisi(sesi, wpPostId, {
      judul: isi.judul,
      dek: isi.dek,
      kategoriId: isi.kategori_id,
      gambarUtamaId: isi.gambar_utama?.id ?? null,
    });
    redirect(`/akun/tulis/${naskahId}/`);
  }

  const naskah = await ambilNaskah(id, sesi.user.id);
  if (!naskah) notFound();
  if (naskah.status === "dikirim") redirect("/akun/");

  let isiHtml: string | null = null;
  let catatan: string | null = null;
  let gambarUtama: { id: number; src: string } | null = null;

  if (naskah.wpPostId && sesi.wpUserId && naskah.status === "revisi") {
    const dariCms = await ambilNaskahCms(naskah.wpPostId, sesi.wpUserId).catch(() => null);
    if (dariCms && (dariCms.status !== "draft" || dariCms.keputusan !== "revisi")) redirect("/akun/");
    if (dariCms) {
      catatan = dariCms.alasan;
      if (isiMasihDariCms(naskah)) {
        isiHtml = uraiGutenberg(dariCms.konten);
        if (dariCms.gambar_utama) gambarUtama = dariCms.gambar_utama;
      }
    } else if (isiMasihDariCms(naskah)) {
      isiHtml = "";
    }
  }

  if (!gambarUtama && naskah.gambarUtamaId) {
    const src = await ambilMediaSrc(naskah.gambarUtamaId);
    gambarUtama = src ? { id: naskah.gambarUtamaId, src } : null;
  }

  const awal: NaskahAwal = {
    id: naskah.id,
    judul: naskah.judul,
    dek: naskah.dek,
    kategoriId: naskah.kategoriId,
    gambarUtama,
    isi: isiHtml === null ? bacaIsi(naskah.isi) : null,
    isiHtml,
    status: naskah.status === "revisi" ? "revisi" : "draf",
    wpPostId: naskah.wpPostId,
    catatanRedaksi: catatan,
    diubah: new Date(naskah.diubah).getTime(),
  };

  return (
    <Kerangka judul={naskah.status === "revisi" ? "Perbaiki tulisan" : "Lanjutkan tulisan"}>
      <EditorNaskah awal={awal} kategori={kategori} profilSiap={siapKirim(sesi)} reporter={penulisRedaksi(sesi.peran)} />
    </Kerangka>
  );
}

function Kerangka({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="font-serif text-[32px] leading-tight font-bold">{judul}</h1>
      {children}
    </>
  );
}

