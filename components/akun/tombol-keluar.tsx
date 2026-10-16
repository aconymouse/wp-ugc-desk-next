"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { keluar } from "@/lib/akun/toko";

export function TombolKeluar({ semuaPerangkat = false }: { semuaPerangkat?: boolean }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);

  return (
    <button
      type="button"
      disabled={sibuk}
      onClick={async () => {
        setSibuk(true);
        await keluar(semuaPerangkat);
        router.push("/");
        router.refresh();
      }}
      className="text-[14px] font-semibold underline decoration-dotted underline-offset-4 hover:decoration-solid disabled:opacity-50"
    >
      {semuaPerangkat ? "Keluar dari semua perangkat" : "Keluar"}
    </button>
  );
}
