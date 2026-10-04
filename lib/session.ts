/**
 * iron-session config — same pattern as worksheets-ai-api reference project.
 * Admin-only auth: password stored in env, no database required.
 */
import { SessionOptions } from "iron-session";

export interface AdminSession {
  isAdmin: boolean;
  loggedInAt?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET || "change-me-min-32-chars-long-secret!!",
  cookieName: "kanle_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,  // 8 hours
  },
};

declare module "iron-session" {
  interface IronSessionData {
    admin?: AdminSession;
  }
}
