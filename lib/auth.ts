import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

// ─── Admin Bootstrap ──────────────────────────────────────────────────────────

/**
 * Returns the ADMIN_EMAIL from env, normalized. Empty when bootstrap is disabled.
 */
function adminBootstrapEmail(): string | null {
  const raw = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return raw && raw.length > 0 ? raw : null;
}

/**
 * If ADMIN_EMAIL is set in env and matches the given email, promote the user
 * to ADMIN. Idempotent and safe to call on every sign-in.
 */
export async function maybePromoteAdmin(email: string, currentRole: Role) {
  const target = adminBootstrapEmail();
  if (!target) return currentRole;
  if (email.toLowerCase() !== target) return currentRole;
  if (currentRole === "ADMIN") return currentRole;

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { role: "ADMIN" },
  });
  return "ADMIN" as Role;
}

// ─── Type Augmentation ────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

// NextAuth v5 beta doesn't expose next-auth/jwt for module augmentation;
// we use a local interface to carry the custom claim shape through callbacks.
interface AppJWT {
  id?: string;
  role?: Role;
  name?: string | null;
  picture?: string | null;
  profileCheckedAt?: number;
  [key: string]: unknown;
}

// How often to re-sync role / name / avatar from the DB (ms). Keeps changes
// — a collaborator approved into a CREATOR, a renamed profile, a new avatar —
// taking effect without forcing the user to sign out and back in.
const PROFILE_REFRESH_MS = 60_000;

// ─── Config ───────────────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
            role: true,
          },
        });

        // Return null for both "user not found" and "wrong password" without
        // distinguishing between them — prevents user enumeration attacks.
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        // Auto-promote if their email matches ADMIN_EMAIL — handles users
        // who registered before ADMIN_EMAIL was configured.
        const role = user.email
          ? await maybePromoteAdmin(user.email, user.role)
          : user.role;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      const t = token as AppJWT;
      // `user` is only present on initial sign-in; subsequent calls only receive token.
      if (user) {
        t.id = user.id!;
        // Run ADMIN_EMAIL bootstrap on every fresh sign-in. Covers OAuth users
        // (Credentials already promotes inside `authorize`).
        let role = user.role;
        if (user.email) {
          role = await maybePromoteAdmin(user.email, user.role);
        }
        t.role = role;
        t.profileCheckedAt = Date.now();
      } else if (t.id) {
        // No `user` = a returning request. Periodically re-read role, name
        // and avatar from the DB so admin-side changes (collaborator
        // approved) and profile edits propagate without a re-login.
        const last =
          typeof t.profileCheckedAt === "number" ? t.profileCheckedAt : 0;
        if (Date.now() - last > PROFILE_REFRESH_MS) {
          const fresh = await prisma.user
            .findUnique({
              where: { id: t.id },
              select: { role: true, name: true, image: true },
            })
            .catch(() => null);
          if (fresh) {
            t.role = fresh.role;
            t.name = fresh.name;
            t.picture = fresh.image;
          }
          t.profileCheckedAt = Date.now();
        }
      }
      return t as typeof token;
    },

    async session({ session, token }) {
      const t = token as AppJWT;
      if (t.id) session.user.id = t.id;
      if (t.role) session.user.role = t.role;
      // Surface the refreshed name/avatar so the navbar reflects profile edits.
      if (t.name !== undefined) session.user.name = t.name;
      if (t.picture !== undefined) session.user.image = t.picture;
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Prisma @default(USER) handles role; this event also runs the
      // ADMIN_EMAIL bootstrap check for OAuth signups.
      if (user.id && user.email) {
        await maybePromoteAdmin(user.email, "USER");
      }
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
});
