const BUILD_PHASE = "phase-production-build";

function normalize(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path || "/wp-json"}`;
  } catch {
    return null;
  }
}

export function getWpApiUrl(): string | null {
  const building = process.env.NEXT_PHASE === BUILD_PHASE;
  return normalize((building && process.env.WORDPRESS_API_URL_BUILD) || process.env.WORDPRESS_API_URL);
}
