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

  // ── Subdomain-based school routing ───────────────────────────────────────
  // When NEXT_PUBLIC_ROOT_DOMAIN is set (e.g. "kanle.app"), requests to
  // school.kanle.app/* are rewritten to /learn/school/* internally so all
  // existing slug-based pages and APIs work without modification.
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "";
  const host = req.headers.get("host") ?? "";
  const isSchoolSubdomain =
    rootDomain !== "" &&
    host !== rootDomain &&
    host !== `www.${rootDomain}` &&
    host.endsWith(`.${rootDomain}`);

  if (isSchoolSubdomain) {
    const slug = host.slice(0, host.length - rootDomain.length - 1);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-tenant-slug", slug);

    // API routes just need the header — no path rewrite
    if (pathname.startsWith("/api/learn")) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Page/asset requests: rewrite /foo → /learn/[slug]/foo unless already scoped
    const alreadyScoped = pathname.startsWith(`/learn/${slug}`);
    if (!alreadyScoped) {
      const rewritePath = `/learn/${slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(new URL(rewritePath, req.url), {
        request: { headers: requestHeaders },
      });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Path-based school routing (/learn/[slug]/*) ──────────────────────────
  if (pathname === "/learn" || pathname.startsWith("/learn/") || pathname.startsWith("/api/learn")) {
    const slugMatch = pathname.match(/^\/learn\/([^/]+)/);
    const tenantSlug = slugMatch?.[1];
    if (tenantSlug && !["login", "register", "dashboard", "courses", "quiz", "certificates", "forgot-password", "reset-password"].includes(tenantSlug)) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-tenant-slug", tenantSlug);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  // Always-public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/learn") ||   // student API — own auth
    pathname.startsWith("/booking") ||     // public booking tracker
    pathname.startsWith("/api/admin/bookings/track") ||
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
