import { useEffect, useSyncExternalStore } from "react";
import {
  bacaAkun,
  bacaAkunServer,
  langgananAkun,
  muatAkunKalauAda,
  type KeadaanAkun,
} from "@/lib/akun/toko";

export function useAkun(): KeadaanAkun {
  const keadaan = useSyncExternalStore(langgananAkun, bacaAkun, bacaAkunServer);
  useEffect(() => {
    muatAkunKalauAda();
  }, []);
  return keadaan;
}

export function namaDepan(nama: string): string {
  return nama.trim().split(/\s+/)[0] ?? "";
}

export function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  const dipilih = bagian.length > 1 ? [bagian[0], bagian[bagian.length - 1]] : bagian;
  return dipilih.map((b) => b.charAt(0).toUpperCase()).join("");
}
