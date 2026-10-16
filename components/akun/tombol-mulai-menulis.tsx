"use client";

import { useRouter } from "next/navigation";
import { useAkun } from "@/components/akun/use-akun";
import { bukaMasuk } from "@/lib/akun/toko";

const TUJUAN = "/akun/tulis/";

export function TombolMulaiMenulis({ className = "" }: { className?: string }) {
  const akun = useAkun();
  const router = useRouter();

  const klik = () => {
    if (akun.status === "masuk" && akun.user) {
      router.push(akun.user.peran !== "kontributor" || akun.user.profilLengkap ? TUJUAN : "/akun/pengaturan/");
      return;
    }
    bukaMasuk(TUJUAN);
  };

  return (
    <button
      type="button"
      onClick={klik}
      className={`inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-paper transition-colors hover:bg-neutral-800 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200 ${className}`}
    >
      {akun.status === "masuk" ? "Mulai menulis" : "Masuk dan mulai menulis"}
    </button>
  );
}
