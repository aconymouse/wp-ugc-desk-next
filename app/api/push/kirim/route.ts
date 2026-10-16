import { NextResponse, after } from "next/server";
import { z } from "zod";
import { PUSH_AKTIF } from "@/lib/push/env";
import {
  VAPID_SIAP,
  catatKiriman,
  hitungTarget,
  sebarArtikel,
  targetTercatat,
  type ArtikelPush,
} from "@/lib/push/kirim";
import { bacaJson, kunciCmsCocok } from "@/lib/push/langganan";

const skema = z.object({
  post_id: z.number().int().positive(),
  judul: z.string().trim().min(1).max(300),
  ringkasan: z.string().max(2000).default(""),
  url: z.url({ protocol: /^https?$/ }),
  gambar: z.url({ protocol: /^https$/ }).nullable().default(null),
  kategori: z.array(z.number().int().positive()).max(100).default([]),
});

function potong(teks: string, maks: number): string {
  const rapi = teks.replace(/\s+/g, " ").trim();
  return rapi.length > maks ? `${rapi.slice(0, maks - 1).trimEnd()}…` : rapi;
}

function tautanPush(url: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "situs");
  u.searchParams.set("utm_medium", "push");
  u.searchParams.set("utm_campaign", "notifikasi");
  return u.toString();
}

export async function POST(req: Request) {
  if (!PUSH_AKTIF) return NextResponse.json({ pesan: "Notifikasi belum aktif di www." }, { status: 404 });
  if (!kunciCmsCocok(req)) return NextResponse.json({ pesan: "Kunci tidak cocok." }, { status: 403 });
  if (!VAPID_SIAP) return NextResponse.json({ pesan: "Kunci VAPID belum dipasang di www." }, { status: 503 });

  const hasil = skema.safeParse(await bacaJson(req));
  if (!hasil.success) return NextResponse.json({ pesan: "Isi permintaan tidak valid." }, { status: 400 });
  const data = hasil.data;

  const artikel: ArtikelPush = {
    postId: data.post_id,
    judul: potong(data.judul, 120),
    isi: potong(data.ringkasan, 160),
    url: tautanPush(data.url),
    gambar: data.gambar,
    kategori: [...new Set(data.kategori)],
  };

  const target = await hitungTarget(artikel.kategori);
  if (!(await catatKiriman(artikel, target))) {
    return NextResponse.json(
      { pesan: "Sudah pernah dikirim.", target: await targetTercatat(artikel.postId) },
      { status: 409 }
    );
  }

  after(async () => {
    try {
      await sebarArtikel(artikel);
    } catch (e) {
      console.error("[push]", artikel.postId, e);
    }
  });

  return NextResponse.json({ ok: true, target });
}
