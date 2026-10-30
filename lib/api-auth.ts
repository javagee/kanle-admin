/**
 * Shared auth helper for admin API routes.
 * Returns the iron-session user + a tenantId scoping value.
 *
 * tenantId:
 *   null  → super_admin, sees ALL data (no filter)
 *   uuid  → tenant_admin / vendor_admin, must be filtered to this tenant
 */
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AdminSession } from "@/lib/session";

export interface AuthContext {
  session: AdminSession;
  /** null = super_admin (no filter). Non-null = must scope all queries. */
  tenantId: string | null;
}

export async function requireAdmin(req: NextRequest): Promise<AuthContext | NextResponse> {
  const res = NextResponse.next();
  const session = await getIronSession<AdminSession>(req, res, sessionOptions);

  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const s = session as unknown as AdminSession;
  const tenantId = s.role === "super_admin" ? null : (s.tenantId ?? null);

  return { session: s, tenantId };
}

export function isAuthError(v: AuthContext | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}
