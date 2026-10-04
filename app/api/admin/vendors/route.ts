/**
 * GET  /api/admin/vendors          — list all vendors with filters
 * POST /api/admin/vendors/[id]/approve — approve a pending vendor
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");
  const location = searchParams.get("location");
  const page     = parseInt(searchParams.get("page") ?? "1");
  const limit    = parseInt(searchParams.get("limit") ?? "20");

  const db = supabaseAdmin();
  let query = db
    .from("vendors")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status)   query = query.eq("status", status);
  if (location) query = query.eq("location", location);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ vendors: data, total: count, page, limit });
}
