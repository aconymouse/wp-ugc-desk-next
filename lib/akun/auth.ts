import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { customSession, emailOTP } from "better-auth/plugins";
import { ambilDb } from "./db";
import { kirimKodeMasuk } from "./email";
import { catatGagalMasuk, emailTerkunci, hapusGagalMasuk } from "./kunci-masuk";
import { KUKI_PETUNJUK, PESAN_TERKUNCI, PRODUKSI, SESI_HARI } from "./env";
import { cocokkanRedaksi, type Peran } from "./peran";
import { SITE_NAME } from "@/lib/situs";

export const HEADER_KODE = "x-ugcd-kode";

const asalTepercaya = [
  "http://localhost:3000",
  process.env.BETTER_AUTH_URL ?? "",
].filter(Boolean);

const opsi = {
  appName: SITE_NAME,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  basePath: "/api/auth",
  database: { db: ambilDb(), type: "mysql" },
  trustedOrigins: asalTepercaya,
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * SESI_HARI,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      username: { type: "string", required: false, input: false },
      jabatan: { type: "string", required: false, input: false },
      bio: { type: "string", required: false, input: false },
      website: { type: "string", required: false, input: false },
      medsos: { type: "string", required: false, input: false },
      wpUserId: { type: "number", required: false, input: false },
      ppmaTermId: { type: "number", required: false, input: false },
      avatarMediaId: { type: "number", required: false, input: false },
      profilLengkap: { type: "boolean", required: false, input: false, defaultValue: false },
    },
    changeEmail: { enabled: false },
    deleteUser: { enabled: false },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  advanced: {
    cookiePrefix: "ugcd",
    useSecureCookies: PRODUKSI,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email-otp": { window: 600, max: 10 },
      "/email-otp/send-verification-otp": { window: 600, max: 5 },
      "/sign-in/social": { window: 60, max: 10 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email-otp") {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
        if (email && (await emailTerkunci(email))) {
          throw new APIError("TOO_MANY_REQUESTS", { message: PESAN_TERKUNCI, code: "AKUN_TERKUNCI" });
        }
        return;
      }
      if (ctx.path !== "/email-otp/send-verification-otp") return;
      const kunci = process.env.BETTER_AUTH_SECRET;
      if (!kunci || ctx.headers?.get(HEADER_KODE) !== kunci) {
        throw new APIError("FORBIDDEN", { message: "Kirim kode lewat formulir masuk." });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email-otp") {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
        const hasil = ctx.context.returned;
        if (email && hasil instanceof APIError) {
          const kode = (hasil.body as { code?: string } | undefined)?.code;
          if (kode === "INVALID_OTP" || kode === "TOO_MANY_ATTEMPTS") {
            const maju = ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
            await catatGagalMasuk(email, maju || ctx.headers?.get("x-real-ip") || null);
          }
        } else if (email && ctx.context.newSession) {
          await hapusGagalMasuk(email);
        }
      }
      const opsiKuki = { path: "/", sameSite: "lax", secure: PRODUKSI, httpOnly: false } as const;
      if (ctx.context.newSession) {
        ctx.setCookie(KUKI_PETUNJUK, "1", { ...opsiKuki, maxAge: 60 * 60 * 24 * SESI_HARI });
      } else if (ctx.path === "/sign-out") {
        ctx.setCookie(KUKI_PETUNJUK, "", { ...opsiKuki, maxAge: 0 });
      }
    }),
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") return;
        await kirimKodeMasuk(email, otp);
      },
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...opsi,
  plugins: [
    ...opsi.plugins,
    customSession(async ({ user, session }) => {
      const redaksi = await cocokkanRedaksi(user.email).catch(() => null);
      const peran: Peran = redaksi?.peran ?? "kontributor";
      return { user: { ...user, peran }, session };
    }, opsi),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type PenggunaAkun = typeof auth.$Infer.Session.user;
