import { cache } from "react";
import { headers } from "next/headers";
import { auth, type PenggunaAkun } from "./auth";
import { ambilDb } from "./db";
import { cocokkanRedaksi, penulisRedaksi, type Peran } from "./peran";
import { profilSiapKirim } from "./profil";

export interface Sesi {
  user: PenggunaAkun;
  peran: Peran;
  wpUserId: number | null;
  slugRedaksi: string | null;
}

export const ambilSesi = cache(async (): Promise<Sesi | null> => {
  const data = await auth.api.getSession({ headers: await headers() });
  if (!data?.user) return null;
  const user = data.user as PenggunaAkun;
  const redaksi = await cocokkanRedaksi(user.email);
  if (redaksi) {
    if (!user.name && redaksi.nama) {
      user.name = redaksi.nama;
      void ambilDb()
        .updateTable("user")
        .set({ name: redaksi.nama, updatedAt: new Date() })
        .where("id", "=", user.id)
        .execute()
        .catch(() => null);
    }
    return {
      user,
      peran: redaksi.peran,
      wpUserId: redaksi.wpUserId,
      slugRedaksi: redaksi.slug,
    };
  }
  return {
    user,
    peran: "kontributor",
    wpUserId: user.wpUserId ?? null,
    slugRedaksi: null,
  };
});

export function bolehMenulis(sesi: Sesi): boolean {
  return penulisRedaksi(sesi.peran) || (sesi.peran === "kontributor" && Boolean(sesi.user.profilLengkap));
}

export function siapKirim(sesi: Sesi): boolean {
  return penulisRedaksi(sesi.peran) || (sesi.peran === "kontributor" && profilSiapKirim(sesi.user));
}

export function ipDari(req: Request): string | null {
  const maju = req.headers.get("x-forwarded-for");
  if (maju) return maju.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
