import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NavAkun } from "@/components/akun/nav-akun";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { ambilSesi } from "@/lib/akun/sesi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Akun saya",
  robots: { index: false, follow: false },
};

export default async function AkunLayout({ children }: { children: React.ReactNode }) {
  if (!AKUN_AKTIF) notFound();
  const sesi = await ambilSesi();
  if (!sesi) redirect("/?masuk=1&lanjut=%2Fakun%2F");
  const tab = sesi.peran === "kontributor" && Boolean(sesi.user.profilLengkap);
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 lg:py-14">
      {tab && <NavAkun />}
      {children}
    </div>
  );
}
