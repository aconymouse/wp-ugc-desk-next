import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PengaturanForm } from "@/components/akun/pengaturan-form";
import { akunLamaDiCms } from "@/lib/akun/cms";
import { saranUsername, uraiMedsos } from "@/lib/akun/profil";
import { ambilSesi } from "@/lib/akun/sesi";
import { SITE_NAME } from "@/lib/situs";

export const metadata: Metadata = { title: "Pengaturan akun" };

export default async function PengaturanPage() {
  const sesi = await ambilSesi();
  if (!sesi) redirect("/?masuk=1&lanjut=%2Fakun%2Fpengaturan%2F");
  const { user, peran } = sesi;
  if (peran !== "kontributor") redirect("/akun/");

  const lengkap = Boolean(user.profilLengkap);
  const usernameLama = user.username ? null : await akunLamaDiCms(user.email).catch(() => null);

  return (
    <>
      <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Akun saya</p>
      <h1 className="mt-2 font-serif text-[32px] leading-tight font-bold">
        {lengkap ? "Pengaturan akun" : "Lengkapi profil kamu"}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        Halo warga {SITE_NAME}, biar kece dan mudah dikenali, isi profil kamu adalah kewajiban konstitusi
        {SITE_NAME}.
      </p>

      <PengaturanForm
        awal={{
          nama: user.name,
          email: user.email,
          image: user.image ?? null,
          username: user.username ?? null,
          usernameLama,
          saranUsername: saranUsername(user.email),
          jabatan: user.jabatan ?? "",
          bio: user.bio ?? "",
          website: user.website ?? "",
          medsos: uraiMedsos(user.medsos),
          profilLengkap: lengkap,
        }}
      />
    </>
  );
}
