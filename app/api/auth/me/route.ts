import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<AdminSession>(req, res, sessionOptions);

  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let features: Record<string, boolean> | null = null;
  if (session.role === "tenant_admin" && session.tenantId) {
    const { data } = await supabaseAdmin()
      .from("tenants")
      .select("metadata")
      .eq("id", session.tenantId)
      .single();
    features = (data?.metadata as Record<string, unknown>)?.features as Record<string, boolean> ?? null;
  }

  return NextResponse.json({
    userId:   session.userId,
    email:    session.email,
    name:     session.name,
    role:     session.role,
    tenantId: session.tenantId,
    vendorId: session.vendorId,
    features,
  });
}
