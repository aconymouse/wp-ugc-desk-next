import { CmsError, akunLamaDiCms, buatKontributor, perbaruiKontributor, usernameAdaDiCms } from "./cms";
import { ambilDb, catatLog } from "./db";
import { WP_OFF } from "./env";
import { bersihkanHandle, cekUsername, type DataProfil } from "./profil";
import type { Sesi } from "./sesi";
import { SITE_NAME } from "@/lib/situs";

export class ProfilError extends Error {
  status: number;
  bidang?: string;
  constructor(status: number, pesan: string, bidang?: string) {
    super(pesan);
    this.status = status;
    this.bidang = bidang;
  }
}

export async function usernameTersedia(
  username: string,
  kecualiUserId: string
): Promise<string | null> {
  const salah = cekUsername(username);
  if (salah) return salah;
  const dipakai = await ambilDb()
    .selectFrom("user")
    .select("id")
    .where("username", "=", username)
    .where("id", "!=", kecualiUserId)
    .executeTakeFirst();
  if (dipakai) return "Username sudah dipakai orang lain.";
  if (await usernameAdaDiCms(username)) return "Username sudah dipakai orang lain.";
  return null;
}

function rapikanMedsos(medsos: DataProfil["medsos"]): DataProfil["medsos"] {
  const hasil: DataProfil["medsos"] = {};
  for (const [kunci, nilai] of Object.entries(medsos)) {
    const bersih = bersihkanHandle(nilai ?? "");
    if (bersih) hasil[kunci as keyof DataProfil["medsos"]] = bersih;
  }
  return hasil;
}

export interface HasilSimpan {
  username: string;
  profilLengkap: boolean;
  image: string | null;
}

export async function simpanProfil(
  sesi: Sesi,
  data: DataProfil,
  ip: string | null
): Promise<HasilSimpan> {
  if (sesi.peran !== "kontributor") {
    throw new ProfilError(403, "Profil redaksi diatur lewat cms.");
  }
  const db = ambilDb();
  const user = sesi.user;
  const medsos = rapikanMedsos(data.medsos);

  let username = user.username ?? null;
  if (!username) {
    let lama: string | null;
    try {
      lama = await akunLamaDiCms(user.email);
    } catch {
      throw new ProfilError(502, "Profil gagal disimpan ke cms. Coba lagi sebentar lagi.");
    }
    if (lama) {
      username = lama;
    } else {
      const calon = data.username?.trim().toLowerCase() ?? "";
      const pesan = await usernameTersedia(calon, user.id);
      if (pesan) throw new ProfilError(400, pesan, "username");
      username = calon;
    }
  }

  let wpUserId = user.wpUserId ?? null;
  let ppmaTermId = user.ppmaTermId ?? null;
  let avatarMediaId = user.avatarMediaId ?? null;
  let image = user.image ?? null;

  if (!WP_OFF) {
    try {
      if (!wpUserId) {
        const hasil = await buatKontributor({
          username,
          email: user.email,
          nama: data.nama,
          jabatan: data.jabatan,
          bio: data.bio,
          website: data.website,
          medsos,
          avatarUrl: image,
        });
        wpUserId = hasil.wp_user_id;
        ppmaTermId = hasil.ppma_term_id;
        if (hasil.username) username = hasil.username;
        if (hasil.avatar_media_id) avatarMediaId = hasil.avatar_media_id;
        if (hasil.avatar_url) image = hasil.avatar_url;
      } else {
        await perbaruiKontributor(wpUserId, {
          nama: data.nama,
          jabatan: data.jabatan,
          bio: data.bio,
          website: data.website,
          medsos,
          avatarUrl: image,
          avatar_media_id: avatarMediaId,
        });
      }
    } catch (e) {
      if (e instanceof CmsError && e.kode === "ugcd_email_redaksi") {
        throw new ProfilError(409, `Email ini sudah terdaftar di cms ${SITE_NAME}. Hubungi redaksi untuk menyambungkannya.`);
      }
      if (e instanceof CmsError && e.status === 409) {
        throw new ProfilError(400, "Username sudah dipakai orang lain.", "username");
      }
      throw new ProfilError(502, "Profil gagal disimpan ke cms. Coba lagi sebentar lagi.");
    }
  }

  await db
    .updateTable("user")
    .set({
      name: data.nama,
      username,
      jabatan: data.jabatan || null,
      bio: data.bio,
      website: data.website || null,
      medsos: Object.keys(medsos).length ? JSON.stringify(medsos) : null,
      wpUserId,
      ppmaTermId,
      avatarMediaId,
      image,
      profilLengkap: true,
      updatedAt: new Date(),
    })
    .where("id", "=", user.id)
    .execute();

  await catatLog(user.id, user.profilLengkap ? "profil" : "profil-pertama", ip);

  return { username, profilLengkap: true, image };
}
