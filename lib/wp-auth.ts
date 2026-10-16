import { getWpApiUrl } from "./wp-url";

const AUTH_USER = process.env.WORDPRESS_AUTH_USER;
const AUTH_PASS = process.env.WORDPRESS_AUTH_PASS;

function authHeaders(): HeadersInit {
  if (!AUTH_USER || !AUTH_PASS) return {};
  const token = Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

export async function wpAuthFetch<T>(path: string, revalidate = 3600): Promise<T | null> {
  const base = getWpApiUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      headers: authHeaders(),
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
