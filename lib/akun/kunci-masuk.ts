import { ambilDb } from "./db";
import { kirimPeringatanMasuk } from "./email";

export const BATAS_GAGAL = 15;
const JENDELA_MS = 60 * 60 * 1000;
const SIMPAN_MS = 24 * 60 * 60 * 1000;

function rapikan(email: string): string {
  return email.trim().toLowerCase();
}

async function jumlahGagal(email: string): Promise<number> {
  const baris = await ambilDb()
    .selectFrom("gagal_masuk")
    .select((eb) => eb.fn.countAll<number>().as("jumlah"))
    .where("email", "=", email)
    .where("waktu", ">", new Date(Date.now() - JENDELA_MS))
    .executeTakeFirst();
  return Number(baris?.jumlah ?? 0);
}

export async function emailTerkunci(email: string): Promise<boolean> {
  try {
    return (await jumlahGagal(rapikan(email))) >= BATAS_GAGAL;
  } catch {
    return false;
  }
}

export async function catatGagalMasuk(email: string, ip: string | null): Promise<void> {
  const surel = rapikan(email);
  const db = ambilDb();
  try {
    await db.insertInto("gagal_masuk").values({ email: surel, ip, waktu: new Date() }).execute();
    await db.deleteFrom("gagal_masuk").where("waktu", "<", new Date(Date.now() - SIMPAN_MS)).execute();
    if ((await jumlahGagal(surel)) !== BATAS_GAGAL) return;
    const pemilik = await db.selectFrom("user").select("id").where("email", "=", surel).executeTakeFirst();
    if (pemilik) await kirimPeringatanMasuk(surel);
  } catch {}
}

export async function hapusGagalMasuk(email: string): Promise<void> {
  try {
    await ambilDb().deleteFrom("gagal_masuk").where("email", "=", rapikan(email)).execute();
  } catch {}
}
