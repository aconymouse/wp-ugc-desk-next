"use client";

import Image from "next/image";
import { inisial } from "@/components/akun/use-akun";

export function AvatarAkun({
  nama,
  src,
  ukuran,
  className = "",
}: {
  nama: string;
  src: string | null | undefined;
  ukuran: number;
  className?: string;
}) {
  const kelas = `shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 ${className}`;
  if (src) {
    return (
      <span className={kelas} style={{ width: ukuran, height: ukuran }}>
        <Image
          src={src}
          alt={nama}
          width={ukuran * 2}
          height={ukuran * 2}
          unoptimized
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-[50%_30%]"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`${kelas} flex items-center justify-center font-serif font-semibold text-neutral-600 dark:text-neutral-300`}
      style={{ width: ukuran, height: ukuran, fontSize: Math.round(ukuran * 0.4) }}
    >
      {inisial(nama)}
    </span>
  );
}
