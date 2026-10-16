import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AturNotifikasi, type KategoriPush } from "@/components/push/atur-notifikasi";
import Breadcrumb from "@/components/breadcrumb";
import { SITE_NAME, absoluteUrl } from "@/lib/situs";
import { KUNCI_PUBLIK, PUSH_AKTIF } from "@/lib/push/env";
import { stripHtml, wpFetch } from "@/lib/wp";

const JUDUL = "Notifikasi";
const DESKRIPSI = `Nyalakan notifikasi ${SITE_NAME} dan pilih kategori berita yang mau kamu ikuti.`;
const URL_HALAMAN = absoluteUrl("/notifikasi/");
const BUANG = new Set(["uncategorized", "tanpa-kategori"]);

export const metadata: Metadata = {
  title: JUDUL,
  description: DESKRIPSI,
  alternates: { canonical: URL_HALAMAN },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: URL_HALAMAN,
    title: `${JUDUL} — ${SITE_NAME}`,
    description: DESKRIPSI,
  },
};

async function ambilKategori(): Promise<KategoriPush[]> {
  try {
    const daftar = await wpFetch<{ id: number; name: string; slug: string }[]>(
      "/wp/v2/categories?per_page=100&orderby=count&order=desc&hide_empty=true&_fields=id,name,slug",
      3600
    );
    return daftar.filter((k) => !BUANG.has(k.slug)).map((k) => ({ id: k.id, nama: stripHtml(k.name) }));
  } catch {
    return [];
  }
}

export default async function NotifikasiPage() {
  if (!PUSH_AKTIF || !KUNCI_PUBLIK) notFound();
  const kategori = await ambilKategori();

  return (
    <div className="mx-auto max-w-[680px] px-5 pt-7 pb-20 sm:px-6">
      <Breadcrumb jejak={[{ nama: "Beranda", href: "/" }, { nama: JUDUL }]} />

      <AturNotifikasi kategori={kategori} />
    </div>
  );
}
