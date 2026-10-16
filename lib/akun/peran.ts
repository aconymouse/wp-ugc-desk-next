import { wpAuthFetch } from "@/lib/wp-auth";
import { peranReporterCms } from "./cms";
import { WP_OFF } from "./env";

export type Peran = "kontributor" | "reporter" | "penulis" | "editor" | "admin";

export const LABEL_PERAN: Record<Peran, string> = {
  kontributor: "Kontributor",
  reporter: "Reporter",
  penulis: "Penulis",
  editor: "Editor",
  admin: "Administrator",
};

export interface Redaksi {
  peran: Peran;
  wpUserId: number;
  slug: string;
  nama: string;
}

interface WpUserSunting {
  id: number;
  email?: string;
  roles?: string[];
  slug: string;
  name?: string;
}

const PERAN_WP: Record<string, Peran> = {
  administrator: "admin",
  editor: "editor",
  author: "penulis",
};

export async function cocokkanRedaksi(email: string): Promise<Redaksi | null> {
  if (WP_OFF) return null;
  const surel = email.trim().toLowerCase();
  const daftar = await wpAuthFetch<WpUserSunting[]>(
    `/wp/v2/users?context=edit&search=${encodeURIComponent(surel)}&per_page=10&_fields=id,email,roles,slug,name`,
    600
  );
  if (!daftar) return null;
  const user = daftar.find((u) => u.email?.toLowerCase() === surel);
  if (!user) return null;
  let peran: Peran | undefined = user.roles?.map((r) => PERAN_WP[r]).find(Boolean);
  if (!peran && user.roles?.length) {
    const reporter = await peranReporterCms();
    if (user.roles.some((r) => reporter.includes(r))) peran = "reporter";
  }
  if (!peran) return null;
  return { peran, wpUserId: user.id, slug: user.slug, nama: user.name?.trim() ?? "" };
}

export function penulisRedaksi(peran: Peran): boolean {
  return peran === "reporter" || peran === "penulis";
}

export function bisaMenulis(peran: Peran): boolean {
  return peran === "kontributor" || penulisRedaksi(peran);
}

export function redaksiBolehMengelola(peran: Peran): boolean {
  return peran === "editor" || peran === "admin";
}
