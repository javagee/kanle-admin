import { SessionOptions } from "iron-session";

export type AdminRole = "super_admin" | "tenant_admin" | "school_operator" | "vendor_admin";

export interface AdminSession {
  isAuthenticated: boolean;
  userId:    string;
  email:     string;
  name:      string;
  role:      AdminRole;
  tenantId:  string | null;   // null for super_admin
  vendorId:  string | null;   // set for vendor_admin only
  // Legacy flag kept for backwards compat during transition
  isAdmin?: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET || "change-me-min-32-chars-long-secret!!",
  cookieName: "hipyhub_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  },
};

/** Navigation items visible to each role. */
export const ROLE_NAV: Record<AdminRole, { label: string; href: string; icon: string }[]> = {
  super_admin: [
    { label: "Overview",       href: "/admin",               icon: "📊" },
    { label: "Tenants",        href: "/admin/tenants",       icon: "🏢" },
    { label: "Bookings",       href: "/admin/bookings",      icon: "🗓️" },
    { label: "Finance",        href: "/admin/finance",       icon: "💰" },
    { label: "Agents",         href: "/admin/agents",        icon: "🤝" },
    { label: "SSE Members",    href: "/admin/sse",           icon: "🏅" },
    { label: "Vendors",        href: "/admin/vendors",       icon: "🛍️" },
    { label: "Worksheets",     href: "/admin/worksheets",    icon: "📚" },
    { label: "Conversations",  href: "/admin/conversations", icon: "💬" },
    { label: "CRM",            href: "/admin/crm",           icon: "🗂️" },
    { label: "Settings",       href: "/admin/settings",      icon: "⚙️" },
  ],
  tenant_admin: [
    { label: "Overview",       href: "/admin",               icon: "📊" },
    { label: "Bookings",       href: "/admin/bookings",      icon: "🗓️" },
    { label: "Finance",        href: "/admin/finance",       icon: "💰" },
    { label: "Agents",         href: "/admin/agents",        icon: "🤝" },
    { label: "SSE Members",    href: "/admin/sse",           icon: "🏅" },
    { label: "Vendors",        href: "/admin/vendors",       icon: "🛍️" },
    { label: "Worksheets",     href: "/admin/worksheets",    icon: "📚" },
    { label: "Conversations",  href: "/admin/conversations", icon: "💬" },
    { label: "Security",       href: "/admin/security",      icon: "🔐" },
    { label: "Settings",       href: "/admin/settings",      icon: "⚙️" },
  ],
  school_operator: [
    { label: "Overview",    href: "/admin",              icon: "📊" },
    { label: "Worksheets",  href: "/admin/worksheets",   icon: "📚" },
    { label: "Courses",     href: "/admin/courses",      icon: "🎓" },
    { label: "Students",    href: "/admin/students",     icon: "👩‍🎓" },
    { label: "Settings",    href: "/admin/settings",     icon: "⚙️" },
  ],
  vendor_admin: [
    { label: "Overview",    href: "/admin",              icon: "📊" },
    { label: "Products",    href: "/admin/products",     icon: "📦" },
    { label: "Orders",      href: "/admin/orders",       icon: "🧾" },
    { label: "Settings",    href: "/admin/settings",     icon: "⚙️" },
  ],
};

declare module "iron-session" {
  interface IronSessionData {
    admin?: AdminSession;
  }
}
