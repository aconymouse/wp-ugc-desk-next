export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Kabar Kita";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const SITE_HOST = new URL(SITE_URL).host;
export const NAMA_REDAKSI = `Redaksi ${SITE_NAME}`;
export const CMS_URL = (process.env.NEXT_PUBLIC_CMS_URL ?? "").replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function buildBreadcrumbList(id: string, trail: { name: string; path?: string }[], current?: string) {
  const items: { name: string; path?: string }[] = [
    { name: "Beranda", path: "/" },
    ...trail,
    ...(current ? [{ name: current }] : []),
  ];
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      ...(entry.path && index < items.length - 1 ? { item: absoluteUrl(entry.path) } : {}),
    })),
  };
}
