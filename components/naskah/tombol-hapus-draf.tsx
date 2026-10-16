"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TombolHapusDraf({ id }: { id: string }) {
  const router = useRouter();
  const [tahap, setTahap] = useState<"diam" | "tanya" | "sibuk">("diam");

  if (tahap === "tanya") {
    return (
      <span className="inline-flex items-center gap-3 text-[13px]">
        <span className="text-neutral-500">Hapus draf ini?</span>
        <button
          type="button"
          onClick={async () => {
            setTahap("sibuk");
            await fetch(`/api/akun/naskah/${id}/`, { method: "DELETE" }).catch(() => null);
            router.refresh();
            setTahap("diam");
          }}
          className="font-medium text-red-700 hover:underline hover:underline-offset-4 dark:text-red-400"
        >
          Ya, hapus
        </button>
        <button type="button" onClick={() => setTahap("diam")} className="text-neutral-500 hover:underline hover:underline-offset-4">
          Batal
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={tahap === "sibuk"}
      onClick={() => setTahap("tanya")}
      className="text-[13px] font-medium text-neutral-500 hover:text-ink hover:underline hover:underline-offset-4 disabled:opacity-50 dark:hover:text-paper"
    >
      {tahap === "sibuk" ? "Menghapus…" : "Hapus"}
    </button>
  );
}
