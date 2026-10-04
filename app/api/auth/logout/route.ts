import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AdminSession } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  session.destroy();
  return NextResponse.json({ ok: true });
}
