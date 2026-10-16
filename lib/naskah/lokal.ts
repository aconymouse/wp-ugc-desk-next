import type { NodeJson } from "./blok";

export interface IsiLokal {
  judul: string;
  dek: string;
  kategoriId: number | null;
  gambarUtama: { id: number; src: string } | null;
  isi: NodeJson;
}

export interface SalinanLokal {
  data: IsiLokal;
  waktu: number;
  sinkron: boolean;
}

const AWALAN = "ugcd_naskah:";
const MAKS_BYTE = 1_500_000;

export function kunciLokal(id: string | null): string {
  return `${AWALAN}${id ?? "baru"}`;
}

export function bacaLokal(id: string | null): SalinanLokal | null {
  try {
    const mentah = window.localStorage.getItem(kunciLokal(id));
    if (!mentah) return null;
    const nilai = JSON.parse(mentah) as SalinanLokal;
    if (!nilai || typeof nilai.waktu !== "number" || !nilai.data || typeof nilai.data !== "object") return null;
    return nilai;
  } catch {
    return null;
  }
}

export function tulisLokal(id: string | null, data: IsiLokal, sinkron: boolean): boolean {
  try {
    const mentah = JSON.stringify({ data, waktu: Date.now(), sinkron } satisfies SalinanLokal);
    if (mentah.length > MAKS_BYTE) return false;
    window.localStorage.setItem(kunciLokal(id), mentah);
    return true;
  } catch {
    return false;
  }
}

export function tandaiSinkronLokal(id: string | null): void {
  const ada = bacaLokal(id);
  if (!ada) return;
  try {
    window.localStorage.setItem(kunciLokal(id), JSON.stringify({ ...ada, sinkron: true }));
  } catch {}
}

export function hapusLokal(id: string | null): void {
  try {
    window.localStorage.removeItem(kunciLokal(id));
  } catch {}
}

export function pindahLokal(dari: string | null, ke: string): void {
  const ada = bacaLokal(dari);
  if (!ada) return;
  try {
    window.localStorage.setItem(kunciLokal(ke), JSON.stringify(ada));
    window.localStorage.removeItem(kunciLokal(dari));
  } catch {}
}

export function adaIsi(data: IsiLokal): boolean {
  if (data.judul.trim() || data.dek.trim() || data.kategoriId || data.gambarUtama) return true;
  const anak = data.isi.content ?? [];
  if (anak.length > 1) return true;
  const pertama = anak[0];
  return Boolean(pertama && pertama.type !== "paragraph") || Boolean(pertama?.content?.length);
}
