import Link from "next/link";
import { redirect } from "next/navigation";
import { DaftarTulisan } from "@/components/naskah/daftar-tulisan";
import { LABEL_PERAN, bisaMenulis } from "@/lib/akun/peran";
import { ambilSesi } from "@/lib/akun/sesi";
import { CMS_URL, NAMA_REDAKSI, SITE_NAME } from "@/lib/situs";


export default async function AkunPage({ searchParams }: { searchParams: Promise<{ kirim?: string; baru?: string }> }) {
  const { kirim, baru } = await searchParams;
  const sesi = await ambilSesi();
  if (!sesi) redirect("/?masuk=1&lanjut=%2Fakun%2F");
  const { user, peran } = sesi;

  if (!bisaMenulis(peran)) {
    return (
      <>
        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Akun saya</p>
        <h1 className="mt-2 font-serif text-[32px] leading-tight font-bold">{user.name || NAMA_REDAKSI}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Kamu masuk sebagai <span className="font-semibold text-ink dark:text-paper">{LABEL_PERAN[peran]}</span>{" "}
          {SITE_NAME} dengan email {user.email}. Profil penulis, foto, dan bio untuk redaksi diatur di cms.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`${CMS_URL}/wp-admin/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13px] font-semibold text-paper hover:bg-neutral-800 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200"
          >
            Buka cms
          </a>
          {sesi.slugRedaksi && (
            <Link
              href={`/author/${sesi.slugRedaksi}/`}
              className="inline-flex h-10 items-center rounded-full border border-neutral-200 px-5 text-[13px] font-semibold hover:border-ink dark:border-neutral-800 dark:hover:border-paper"
            >
              Lihat halaman penulis
            </Link>
          )}
        </div>
      </>
    );
  }

  if (peran === "kontributor" && !user.profilLengkap) redirect("/akun/pengaturan/");

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Akun saya</p>
          <h1 className="mt-2 font-serif text-[32px] leading-tight font-bold">Tulisanmu</h1>
        </div>
        <Link
          href="/akun/tulis/"
          className="shrink-0 pb-1.5 text-[14px] font-semibold underline decoration-neutral-400 decoration-dotted underline-offset-4 transition-colors hover:decoration-ink hover:decoration-solid dark:hover:decoration-paper"
        >
          Kirim tulisan
        </Link>
      </div>
      {baru === "1" && (
        <p className="mt-3 text-[14px] leading-relaxed text-ink dark:text-paper">
          Kamu resmi jadi warga {SITE_NAME}. Mulai dari sini: tulis naskah pertamamu, redaksi yang baca dan menerbitkan.
        </p>
      )}
      {kirim === "1" && (
        <p className="mt-3 text-[14px] leading-relaxed text-ink dark:text-paper">
          Naskah terkirim. Redaksi bakal baca dan kabari lewat email.
        </p>
      )}
      <DaftarTulisan sesi={sesi} />
    </>
  );
}
