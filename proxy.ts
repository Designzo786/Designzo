import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session;

  const path = nextUrl.pathname;
  const isAdminLogin = path === "/admin/login";
  const isDashboard = path.startsWith("/dashboard");
  const isAdmin = path.startsWith("/admin") && !isAdminLogin;
  const isAuthPage = path === "/login" || path === "/register";

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Admin login is a special auth page — accessible to everyone, but if
  // you're already an admin, skip straight to the panel.
  if (isAdminLogin) {
    if (isLoggedIn && session?.user?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login, preserving the intended destination
  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Block non-admins from the admin panel — send them to the admin login
  // (better UX than dropping them on the homepage with no signal)
  if (isAdmin) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/login", nextUrl));
    }
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
