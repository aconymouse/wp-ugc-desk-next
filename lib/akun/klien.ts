import { createAuthClient } from "better-auth/react";
import { customSessionClient, emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { Auth } from "./auth";

function denganGarisMiring(url: URL | string): string {
  const u = new URL(String(url), typeof window === "undefined" ? "http://localhost" : window.location.origin);
  if (!u.pathname.endsWith("/")) u.pathname = `${u.pathname}/`;
  return u.toString();
}

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [emailOTPClient(), inferAdditionalFields<Auth>(), customSessionClient<Auth>()],
  fetchOptions: {
    onRequest(ctx) {
      return { ...ctx, url: denganGarisMiring(ctx.url) };
    },
  },
});

export type SesiKlien = typeof authClient.$Infer.Session;
export type PenggunaKlien = SesiKlien["user"];
