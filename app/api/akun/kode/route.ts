import { NextResponse } from "next/server";
import { z } from "zod";
import { HEADER_KODE, auth } from "@/lib/akun/auth";
import { AKUN_AKTIF, MASUK_EMAIL, PESAN_TERKUNCI } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { ipDari } from "@/lib/akun/sesi";
import { emailTerkunci } from "@/lib/akun/kunci-masuk";
import { cekTurnstile } from "@/lib/akun/turnstile";

const skema = z.object({
  email: z.email().max(254),
  token: z.string().max(4096).nullish(),
});

export async function POST(req: Request) {
  if (!AKUN_AKTIF || !MASUK_EMAIL) return new Response(null, { status: 404 });

  let masukan: unknown;
  try {
    masukan = await req.json();
  } catch {
    return NextResponse.json({ pesan: "Permintaan gak lengkap." }, { status: 400 });
  }
  const hasil = skema.safeParse(masukan);
  if (!hasil.success) {
    return NextResponse.json({ pesan: "Alamat email gak valid." }, { status: 400 });
  }

  const email = hasil.data.email.toLowerCase();
  const ip = ipDari(req);
  if (!bolehLewat(`kode:ip:${ip ?? "?"}`, 10, 600) || !bolehLewat(`kode:email:${email}`, 5, 600)) {
    return NextResponse.json(
      { pesan: "Terlalu sering. Tunggu beberapa menit lalu coba lagi." },
      { status: 429 }
    );
  }

  if (await emailTerkunci(email)) {
    return NextResponse.json({ pesan: PESAN_TERKUNCI }, { status: 429 });
  }

  if (!(await cekTurnstile(hasil.data.token ?? undefined, ip))) {
    return NextResponse.json({ pesan: "Verifikasi gagal. Muat ulang lalu coba lagi." }, { status: 400 });
  }

  try {
    await auth.api.sendVerificationOTP({
      body: { email, type: "sign-in" },
      headers: new Headers({ [HEADER_KODE]: process.env.BETTER_AUTH_SECRET ?? "" }),
    });
  } catch {
    return NextResponse.json(
      { pesan: "Kode gagal dikirim. Coba lagi sebentar lagi." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
