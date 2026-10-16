import { Kysely, MysqlDialect } from "kysely";
import { createPool, type Pool } from "mysql2";

export interface TabelUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  username: string | null;
  jabatan: string | null;
  bio: string | null;
  website: string | null;
  medsos: string | null;
  wpUserId: number | null;
  ppmaTermId: number | null;
  avatarMediaId: number | null;
  profilLengkap: boolean;
}

export interface TabelLogAkun {
  id?: number;
  userId: string;
  aksi: string;
  ip: string | null;
  waktu: Date;
}

export interface TabelGagalMasuk {
  id?: number;
  email: string;
  ip: string | null;
  waktu: Date;
}

export interface TabelNaskah {
  id: string;
  userId: string;
  judul: string;
  dek: string;
  kategoriId: number | null;
  tag: string;
  gambarUtamaId: number | null;
  isi: string;
  wpPostId: number | null;
  status: "draf" | "dikirim" | "revisi";
  dibuat: Date;
  diubah: Date;
}

export interface TabelPushLangganan {
  id: string;
  endpoint: string;
  kunciEndpoint: string;
  p256dh: string;
  auth: string;
  semua: number;
  userId: string | null;
  gagal: number;
  dibuat: Date;
  diubah: Date;
  terakhirKirim: Date | null;
}

export interface TabelPushKategori {
  langgananId: string;
  kategoriId: number;
}

export interface TabelPushKirim {
  postId: number;
  judul: string;
  target: number;
  terkirim: number;
  gagal: number;
  mulai: Date;
  selesai: Date | null;
}

export interface BasisAkun {
  user: TabelUser;
  log_akun: TabelLogAkun;
  gagal_masuk: TabelGagalMasuk;
  naskah: TabelNaskah;
  push_langganan: TabelPushLangganan;
  push_kategori: TabelPushKategori;
  push_kirim: TabelPushKirim;
}

const simpanan = globalThis as typeof globalThis & {
  cdPool?: Pool;
  cdDb?: Kysely<BasisAkun>;
};

function ambilPool(): Pool {
  if (!simpanan.cdPool) {
    simpanan.cdPool = createPool({
      uri: process.env.AKUN_DATABASE_URL ?? "mysql://root@127.0.0.1:3306/ugc_desk",
      connectionLimit: 5,
      timezone: "Z",
      charset: "utf8mb4",
    });
  }
  return simpanan.cdPool;
}

export function ambilDb(): Kysely<BasisAkun> {
  if (!simpanan.cdDb) {
    simpanan.cdDb = new Kysely<BasisAkun>({
      dialect: new MysqlDialect({ pool: ambilPool() }),
    });
  }
  return simpanan.cdDb;
}

export async function catatLog(userId: string, aksi: string, ip: string | null) {
  try {
    await ambilDb()
      .insertInto("log_akun")
      .values({ userId, aksi, ip, waktu: new Date() })
      .execute();
  } catch {}
}
