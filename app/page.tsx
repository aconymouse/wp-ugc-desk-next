import Link from "next/link";
import { TombolMulaiMenulis } from "@/components/akun/tombol-mulai-menulis";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { PUSH_AKTIF } from "@/lib/push/env";
import { SITE_NAME } from "@/lib/situs";

export default function Beranda() {
  return (
    <div className="mx-auto max-w-[680px] px-5 pt-16 pb-24 sm:px-6">
      <h1 className="font-serif text-[clamp(34px,6vw,52px)] leading-[1.05] font-bold">{SITE_NAME}</h1>
      <p className="mt-4 max-w-[52ch] text-[15px] leading-7 text-neutral-700 dark:text-neutral-300">
        Pembaca masuk pakai Google atau kode email, menulis di editor sendiri, lalu naskahnya masuk ke WordPress
        sebagai draf untuk dibaca redaksi.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-5 text-[14px]">
        {AKUN_AKTIF ? (
          <TombolMulaiMenulis />
        ) : (
          <p className="text-neutral-500">
            Isi <code>NEXT_PUBLIC_AKUN=1</code> di <code>.env.local</code> untuk menyalakan akun.
          </p>
        )}
        {AKUN_AKTIF && (
          <Link href="/kirim-tulisan/" className="font-semibold underline underline-offset-4">
            Ketentuan dan cara kirim
          </Link>
        )}
        {PUSH_AKTIF && (
          <Link href="/notifikasi/" className="font-semibold underline underline-offset-4">
            Notifikasi
          </Link>
        )}
      </div>
    </div>
  );
}
