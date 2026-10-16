interface Jendela {
  hitung: number;
  mulai: number;
}

const simpanan = globalThis as typeof globalThis & { cdLimit?: Map<string, Jendela> };

function peta(): Map<string, Jendela> {
  if (!simpanan.cdLimit) simpanan.cdLimit = new Map();
  return simpanan.cdLimit;
}

export function bolehLewat(kunci: string, maks: number, detik: number): boolean {
  const kini = Date.now();
  const m = peta();
  if (m.size > 5000) {
    for (const [k, v] of m) {
      if (kini - v.mulai > detik * 1000) m.delete(k);
    }
  }
  const ada = m.get(kunci);
  if (!ada || kini - ada.mulai > detik * 1000) {
    m.set(kunci, { hitung: 1, mulai: kini });
    return true;
  }
  if (ada.hitung >= maks) return false;
  ada.hitung += 1;
  return true;
}
