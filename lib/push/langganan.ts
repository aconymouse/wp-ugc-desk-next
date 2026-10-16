import { createHash, timingSafeEqual } from "node:crypto";
import type { Kysely } from "kysely";
import { z } from "zod";
import type { BasisAkun } from "@/lib/akun/db";

const LAYANAN =
  /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)$/;

export const skemaEndpoint = z.url({ protocol: /^https$/, hostname: LAYANAN }).max(1024);

export const skemaLangganan = z.object({
  endpoint: skemaEndpoint,
  keys: z.object({
    p256dh: z.string().min(16).max(200),
    auth: z.string().min(8).max(100),
  }),
});

export const skemaKategori = z.array(z.number().int().positive()).max(200);

export function kunciEndpoint(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function bacaJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function simpanKategori(db: Kysely<BasisAkun>, langgananId: string, kategori: number[]) {
  await db.deleteFrom("push_kategori").where("langgananId", "=", langgananId).execute();
  if (!kategori.length) return;
  await db
    .insertInto("push_kategori")
    .values(kategori.map((kategoriId) => ({ langgananId, kategoriId })))
    .execute();
}

export function kunciCmsCocok(req: Request): boolean {
  const rahasia = process.env.UGC_DESK_SECRET ?? "";
  const kiriman = req.headers.get("x-ugc-desk-secret") ?? "";
  if (!rahasia || !kiriman || rahasia.length !== kiriman.length) return false;
  return timingSafeEqual(Buffer.from(rahasia), Buffer.from(kiriman));
}
