import { KUKI_PETUNJUK, SESI_HARI } from "./env";
import { authClient, type PenggunaKlien } from "./klien";

export type StatusAkun = "tamu" | "memuat" | "masuk";

export interface KeadaanAkun {
  status: StatusAkun;
  user: PenggunaKlien | null;
}

export interface KeadaanMasuk {
  terbuka: boolean;
  lanjut: string | null;
}

const AWAL_AKUN: KeadaanAkun = { status: "tamu", user: null };
const AWAL_MASUK: KeadaanMasuk = { terbuka: false, lanjut: null };

let akun: KeadaanAkun = AWAL_AKUN;
let masuk: KeadaanMasuk = AWAL_MASUK;
let sedangMemuat: Promise<void> | null = null;

const pendengarAkun = new Set<() => void>();
const pendengarMasuk = new Set<() => void>();

function siarkan(pendengar: Set<() => void>) {
  pendengar.forEach((cb) => cb());
}

export function adaPetunjuk(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${KUKI_PETUNJUK}=1`);
}

export function pasangPetunjuk() {
  document.cookie = `${KUKI_PETUNJUK}=1; path=/; max-age=${SESI_HARI * 86400}; samesite=lax${
    location.protocol === "https:" ? "; secure" : ""
  }`;
}

export function hapusPetunjuk() {
  document.cookie = `${KUKI_PETUNJUK}=; path=/; max-age=0; samesite=lax`;
}

export function bacaAkun(): KeadaanAkun {
  return akun;
}

export function bacaAkunServer(): KeadaanAkun {
  return AWAL_AKUN;
}

export function langgananAkun(cb: () => void) {
  pendengarAkun.add(cb);
  return () => {
    pendengarAkun.delete(cb);
  };
}

function setAkun(baru: KeadaanAkun) {
  akun = baru;
  siarkan(pendengarAkun);
}

export function muatAkun(paksa = false): Promise<void> {
  if (sedangMemuat && !paksa) return sedangMemuat;
  if (akun.status === "tamu") setAkun({ status: "memuat", user: null });
  sedangMemuat = authClient
    .getSession()
    .then(({ data }) => {
      if (data?.user) {
        pasangPetunjuk();
        setAkun({ status: "masuk", user: data.user });
      } else {
        hapusPetunjuk();
        setAkun({ status: "tamu", user: null });
      }
    })
    .catch(() => {
      setAkun({ status: "tamu", user: null });
    })
    .finally(() => {
      sedangMemuat = null;
    });
  return sedangMemuat;
}

export function muatAkunKalauAda() {
  if (akun.status !== "tamu") return;
  if (adaPetunjuk()) void muatAkun();
}

export async function keluar(semuaPerangkat = false) {
  try {
    if (semuaPerangkat) await authClient.revokeSessions();
    await authClient.signOut();
  } finally {
    hapusPetunjuk();
    setAkun({ status: "tamu", user: null });
    if (window.location.pathname.startsWith("/akun")) {
      window.location.assign("/");
    }
  }
}

export function bacaMasuk(): KeadaanMasuk {
  return masuk;
}

export function bacaMasukServer(): KeadaanMasuk {
  return AWAL_MASUK;
}

export function langgananMasuk(cb: () => void) {
  pendengarMasuk.add(cb);
  return () => {
    pendengarMasuk.delete(cb);
  };
}

export function bukaMasuk(lanjut: string | null = null) {
  masuk = { terbuka: true, lanjut };
  siarkan(pendengarMasuk);
}

export function tutupMasuk() {
  if (!masuk.terbuka) return;
  masuk = { terbuka: false, lanjut: masuk.lanjut };
  siarkan(pendengarMasuk);
}

export function ambilLanjut(): string | null {
  const tujuan = masuk.lanjut;
  masuk = { ...masuk, lanjut: null };
  return tujuan;
}
