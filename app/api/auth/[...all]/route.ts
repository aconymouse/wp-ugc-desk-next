import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/akun/auth";
import { AKUN_AKTIF } from "@/lib/akun/env";

const handler = toNextJsHandler(auth);

function tanpaGarisMiring(req: Request): Request {
  const url = new URL(req.url);
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
    return new Request(url, req);
  }
  return req;
}

function mati() {
  return new Response(null, { status: 404 });
}

export async function GET(req: Request) {
  if (!AKUN_AKTIF) return mati();
  return handler.GET(tanpaGarisMiring(req));
}

export async function POST(req: Request) {
  if (!AKUN_AKTIF) return mati();
  return handler.POST(tanpaGarisMiring(req));
}
