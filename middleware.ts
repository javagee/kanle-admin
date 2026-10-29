import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AdminSession, AdminRole } from "@/lib/session";

/** Paths each role can access. super_admin has no restrictions. */
const ROLE_PATHS: Record<AdminRole, RegExp> = {
  super_admin:     /.*/,   // all paths
  tenant_admin:    /^\/admin(\/bookings|\/vendors|\/worksheets|\/agents|\/finance|\/settings|\/crm)?(\/.*)?$|^\/admin$/,
  school_operator: /^\/admin(\/worksheets|\/courses|\/students|\/settings)?(\/.*)?$|^\/admin$/,
  vendor_admin:    /^\/admin(\/products|\/orders|\/settings)?(\/.*)?$|^\/admin$/,
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always-public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/agent") ||
    pathname.startsWith("/api/agent") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getIronSession<AdminSession>(req, res, sessionOptions);

  // Not authenticated → redirect to login
  if (!session.isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based path enforcement (non-super_admin)
  const role = session.role as AdminRole;
  if (role && role !== "super_admin") {
    const allowed = ROLE_PATHS[role];
    if (allowed && !allowed.test(pathname)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // Pass tenant context to API routes via header so route handlers can use it
  const requestHeaders = new Headers(req.headers);
  if (session.tenantId) requestHeaders.set("x-tenant-id", session.tenantId);
  if (session.vendorId) requestHeaders.set("x-vendor-id", session.vendorId);
  requestHeaders.set("x-user-role", role ?? "");
  requestHeaders.set("x-user-id", session.userId ?? "");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
