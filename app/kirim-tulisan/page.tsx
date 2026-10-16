import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TombolMulaiMenulis } from "@/components/akun/tombol-mulai-menulis";
import Breadcrumb from "@/components/breadcrumb";
import { AKUN_AKTIF } from "@/lib/akun/env";
import {
  KETENTUAN_PATH,
  KIRIM_DESKRIPSI,
  KIRIM_FAQ,
  KIRIM_JUDUL,
  KIRIM_URL,
} from "@/lib/akun/halaman";
import { SITE_NAME, SITE_URL, absoluteUrl, buildBreadcrumbList } from "@/lib/situs";
import { KATA_MAKS, KATA_MIN } from "@/lib/naskah/blok";

export const metadata: Metadata = {
  title: KIRIM_JUDUL,
  description: KIRIM_DESKRIPSI,
  alternates: { canonical: KIRIM_URL },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: KIRIM_URL,
    title: `${KIRIM_JUDUL} — ${SITE_NAME}`,
    description: KIRIM_DESKRIPSI,
  },
  twitter: {
    card: "summary_large_image",
    title: `${KIRIM_JUDUL} — ${SITE_NAME}`,
    description: KIRIM_DESKRIPSI,
  },
};

const LANGKAH = [
  {
    nama: "Masuk dan lengkapi profil",
    teks: "Pakai Google atau email. Isi nama, username, foto, dan bio singkat. Profil ini yang nanti tampil di bawah tulisanmu.",
  },
  {
    nama: `Tulis di editor ${SITE_NAME}`,
    teks: `Judul, kategori, lalu isi ${KATA_MIN} sampai ${KATA_MAKS} kata. Draf tersimpan otomatis, bisa dilanjutkan kapan saja dari halaman akun.`,
  },
  {
    nama: "Kirim ke redaksi",
    teks: "Naskah masuk antrean review. Redaksi menerbitkan, minta revisi dengan catatan, atau menolak. Kabarnya dikirim ke email kamu.",
  },
  {
    nama: "Terbit dengan namamu",
    teks: `Tulisan tayang di ${SITE_NAME} sebagai Kolumnis, lengkap dengan foto, bio, dan tautan media sosial dari profilmu.`,
  },
];

const COCOK = [
  "Opini dan analisis soal isu yang lagi ramai, dari sudut pandang yang belum banyak dibahas.",
  "Cerita dari lapangan: pengalaman kerja, kampung halaman, komunitas, atau peristiwa yang kamu saksikan sendiri.",
  "Temuan dan bocoran yang bisa dipertanggungjawabkan, dengan sumber yang jelas.",
  "Ulasan budaya pop, olahraga, teknologi, dan gaya hidup yang punya argumen, bukan sekadar rangkuman.",
];

export default function KirimTulisanPage() {
  if (!AKUN_AKTIF) notFound();

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${KIRIM_URL}#webpage`,
        url: KIRIM_URL,
        name: `${KIRIM_JUDUL} — ${SITE_NAME}`,
        description: KIRIM_DESKRIPSI,
        inLanguage: "id-ID",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        breadcrumb: { "@id": `${KIRIM_URL}#breadcrumb` },
        potentialAction: {
          "@type": "WriteAction",
          name: "Kirim tulisan",
          target: absoluteUrl("/akun/tulis/"),
        },
      },
      {
        "@type": "HowTo",
        "@id": `${KIRIM_URL}#howto`,
        name: `Cara mengirim tulisan ke ${SITE_NAME}`,
        description: KIRIM_DESKRIPSI,
        step: LANGKAH.map((l, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: l.nama,
          text: l.teks,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${KIRIM_URL}#faq`,
        mainEntity: KIRIM_FAQ.map((f) => ({
          "@type": "Question",
          name: f.tanya,
          acceptedAnswer: { "@type": "Answer", text: f.jawab },
        })),
      },
      buildBreadcrumbList(`${KIRIM_URL}#breadcrumb`, [], "Kirim Tulisan"),
    ],
  }).replace(/</g, "\\u003c");

  return (
    <div className="mx-auto max-w-[720px] px-5 pt-7 pb-20 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Breadcrumb jejak={[{ nama: "Beranda", href: "/" }, { nama: "Kirim Tulisan" }]} />

      <header className="mb-8 border-b-2 border-ink pb-6 dark:border-paper">
        <h1 className="font-serif text-[clamp(28px,5.5vw,44px)] leading-[1.1] font-bold text-ink dark:text-paper">
          Tulis di {SITE_NAME}
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-neutral-700 dark:text-neutral-300">
          {SITE_NAME} dibaca ribuan orang tiap hari, dan sebagian cerita terbaik datang dari pembacanya sendiri. Kalau
          kamu punya opini, pengalaman, atau temuan yang layak dibaca lebih banyak orang, kirim ke kami. Redaksi
          yang membaca, menyunting, dan menerbitkannya dengan namamu.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <TombolMulaiMenulis />
          <Link
            href={KETENTUAN_PATH}
            className="text-[13px] text-neutral-600 underline decoration-dotted underline-offset-4 hover:text-ink dark:text-neutral-400 dark:hover:text-paper"
          >
            Baca ketentuan kontributor
          </Link>
        </div>
      </header>

      <section aria-labelledby="cara-heading" className="mb-10">
        <h2 id="cara-heading" className="mb-5 font-serif text-[24px] leading-tight font-bold">
          Caranya
        </h2>
        <ol className="grid gap-5">
          {LANGKAH.map((l, i) => (
            <li key={l.nama} className="grid grid-cols-[36px_1fr] gap-4">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ink font-serif text-[15px] font-bold dark:border-paper"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[16px] leading-6 font-semibold">{l.nama}</h3>
                <p className="mt-1 text-[14px] leading-6 text-neutral-600 dark:text-neutral-400">{l.teks}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cocok-heading" className="mb-10">
        <h2 id="cocok-heading" className="mb-4 font-serif text-[24px] leading-tight font-bold">
          Tulisan yang kami cari
        </h2>
        <ul className="grid gap-2.5 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">
          {COCOK.map((c) => (
            <li key={c} className="flex gap-3">
              <span aria-hidden className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink dark:bg-paper" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[14px] leading-6 text-neutral-600 dark:text-neutral-400">
          Yang gak kami terima: tulisan yang sudah tayang di tempat lain, promosi terselubung, serangan ke pribadi,
          dan apa pun yang gak bisa kamu pertanggungjawabkan. Lengkapnya ada di{" "}
          <Link href={KETENTUAN_PATH} className="underline decoration-dotted underline-offset-4 hover:text-ink dark:hover:text-paper">
            ketentuan kontributor
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="faq-heading" className="mb-12">
        <h2 id="faq-heading" className="mb-4 font-serif text-[24px] leading-tight font-bold">
          Pertanyaan yang sering masuk
        </h2>
        <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {KIRIM_FAQ.map((f) => (
            <details key={f.tanya} className="group py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] leading-6 font-semibold [&::-webkit-details-marker]:hidden">
                {f.tanya}
                <span aria-hidden className="mt-0.5 shrink-0 text-neutral-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 pr-8 text-[14px] leading-6 text-neutral-600 dark:text-neutral-400">{f.jawab}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-neutral-200 p-6 text-center dark:border-neutral-800">
        <p className="font-serif text-[20px] leading-tight font-bold">Siap nulis?</p>
        <p className="mt-2 text-[14px] leading-6 text-neutral-600 dark:text-neutral-400">
          Draf tersimpan otomatis, jadi gak harus selesai sekali duduk.
        </p>
        <TombolMulaiMenulis className="mt-5" />
      </div>
    </div>
  );
}
