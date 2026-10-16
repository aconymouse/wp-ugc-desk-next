export const LAPORAN_KATA_MIN = 60;
export const LAPORAN_KATA_MAKS = 135;
export const LAPORAN_KUNCI = "ugcd_laporan";
export const LAPORAN_PER_HARI = 2;
const SUDAH_KUNCI = "ugcd_sudah_lapor";

export function hitungKata(teks: string): number {
  return teks.trim().split(/\s+/).filter(Boolean).length;
}

export function laporanValid(teks: string): boolean {
  const n = hitungKata(teks);
  return n >= LAPORAN_KATA_MIN && n <= LAPORAN_KATA_MAKS;
}

export interface DrafLaporan {
  postId: number;
  pesan: string;
}

export function bacaDraf(postId: number): string {
  try {
    const mentah = sessionStorage.getItem(`${LAPORAN_KUNCI}_${postId}`);
    return mentah ?? "";
  } catch {
    return "";
  }
}

export function simpanDraf(postId: number, pesan: string) {
  try {
    if (pesan.trim()) sessionStorage.setItem(`${LAPORAN_KUNCI}_${postId}`, pesan);
    else sessionStorage.removeItem(`${LAPORAN_KUNCI}_${postId}`);
  } catch {}
}

export function hapusDraf(postId: number) {
  try {
    sessionStorage.removeItem(`${LAPORAN_KUNCI}_${postId}`);
  } catch {}
}

const TETAP_KUNCI = "ugcd_tetap_di_sini";

export function tandaiTetapDiSini() {
  try {
    sessionStorage.setItem(TETAP_KUNCI, "1");
  } catch {}
}

export function ambilTetapDiSini(): boolean {
  try {
    const ada = sessionStorage.getItem(TETAP_KUNCI) === "1";
    sessionStorage.removeItem(TETAP_KUNCI);
    return ada;
  } catch {
    return false;
  }
}

export function sudahLapor(postId: number): boolean {
  try {
    const mentah = localStorage.getItem(`${SUDAH_KUNCI}_${postId}`);
    if (!mentah) return false;
    if (Date.now() - Number(mentah) > 86400000) {
      localStorage.removeItem(`${SUDAH_KUNCI}_${postId}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function tandaiSudahLapor(postId: number) {
  try {
    localStorage.setItem(`${SUDAH_KUNCI}_${postId}`, String(Date.now()));
  } catch {}
}
