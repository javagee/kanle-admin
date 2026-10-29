import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import bcrypt from "bcryptjs";
import { sessionOptions, AdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Look up user by email
  const { data: users, error } = await db
    .from("admin_users")
    .select("id, email, name, role, tenant_id, vendor_id, hashed_password, status")
    .eq("email", email.toLowerCase().trim())
    .limit(1);

  if (error || !users?.length) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const user = users[0];

  if (user.status !== "active") {
    return NextResponse.json({ error: "Account suspended. Contact your administrator." }, { status: 403 });
  }

  // Compare password
  const valid = await bcrypt.compare(password, user.hashed_password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Update last_login_at (best-effort)
  db.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id).then(() => {});

  const res = NextResponse.json({
    ok: true,
    role: user.role,
    name: user.name,
    tenantId: user.tenant_id,
  });

  const session = await getIronSession<AdminSession>(req, res, sessionOptions);
  session.isAuthenticated = true;
  session.isAdmin = true;          // legacy compat
  session.userId   = user.id;
  session.email    = user.email;
  session.name     = user.name;
  session.role     = user.role;
  session.tenantId = user.tenant_id ?? null;
  session.vendorId = user.vendor_id ?? null;
  await session.save();

  return res;
}
