import { PRODUKSI, WP_OFF } from "./env";

const VERIFIKASI = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export async function cekTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const rahasia = process.env.TURNSTILE_SECRET;
  if (!rahasia) return !PRODUKSI || WP_OFF;
  if (!token) return false;
  const body = new URLSearchParams({ secret: rahasia, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch(VERIFIKASI, { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
