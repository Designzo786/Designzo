import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

// Required for file uploads in API routes that use NextAuth
export const runtime = "nodejs";
