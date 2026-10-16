import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ambilDb, catatLog } from "@/lib/akun/db";
import { kirimKabarNaskah } from "@/lib/akun/email";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { cocokkanRedaksi } from "@/lib/akun/peran";

const skema = z.object({
  kejadian: z.enum(["terbit", "revisi", "ditolak", "ubah-selesai"]),
  post_id: z.number().int().positive(),
  naskah_id: z.string().max(36).default(""),
  akun_id: z.string().min(1).max(64),
  wp_user_id: z.number().int().positive(),
  judul: z.string().max(200).default(""),
  alasan: z.string().max(1000).default(""),
  link: z.string().url().nullable().default(null),
});

function kunciCocok(req: Request): boolean {
  const rahasia = process.env.UGC_DESK_SECRET ?? "";
  const kiriman = req.headers.get("x-ugc-desk-secret") ?? "";
  if (!rahasia || !kiriman || rahasia.length !== kiriman.length) return false;
  return timingSafeEqual(Buffer.from(rahasia), Buffer.from(kiriman));
}

export async function POST(req: Request) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  if (!kunciCocok(req)) return NextResponse.json({ pesan: "Kunci tidak cocok." }, { status: 403 });

  let data;
  try {
    data = skema.parse(await req.json());
  } catch {
    return NextResponse.json({ pesan: "Isi permintaan tidak valid." }, { status: 400 });
  }

  const db = ambilDb();
  const user = await db
    .selectFrom("user")
    .select(["id", "name", "email", "wpUserId"])
    .where("id", "=", data.akun_id)
    .executeTakeFirst();
  if (!user) return NextResponse.json({ pesan: "Akun tidak ditemukan." }, { status: 404 });
  const wpUserId = user.wpUserId ?? (await cocokkanRedaksi(user.email).catch(() => null))?.wpUserId ?? null;
  if (wpUserId !== data.wp_user_id) {
    return NextResponse.json({ pesan: "Akun tidak ditemukan." }, { status: 404 });
  }

  if (data.kejadian !== "ubah-selesai") {
    await db
      .updateTable("naskah")
      .set(data.kejadian === "revisi" ? { status: "revisi", isi: "", diubah: new Date() } : { status: "dikirim", diubah: new Date() })
      .where("userId", "=", user.id)
      .where("wpPostId", "=", data.post_id)
      .execute();
  }

  await catatLog(user.id, `naskah-${data.kejadian}:${data.post_id}`, null);

  try {
    await kirimKabarNaskah(user.email, user.name, data.kejadian, data.judul, data.alasan, data.link);
  } catch {
    return NextResponse.json({ ok: true, email: false });
  }
  return NextResponse.json({ ok: true, email: true });
}
