# HipyHub Platform — System Documentation

> Living technical reference for the HipyHub multi-tenant WhatsApp AI chatbot + admin ERP.  
> Last updated: 2026-10-31

---

## 1. Platform Overview

HipyHub is a **multi-tenant WhatsApp AI chatbot and admin ERP** built for 康乐·逍遥游 (HipyHub Tours), a Singapore tour operator selling Batam and Bali packages (S$140–S$350/pax).

### Stack

| Layer | Technology |
|---|---|
| Bot API | Python FastAPI (Vercel, `sin1` region) |
| Admin dashboard | Next.js 14 App Router (Vercel) |
| Database | Supabase (PostgreSQL + Storage) |
| Cache / session | Upstash Redis (REST API) |
| Email | Brevo (Sendinblue) transactional API |
| WhatsApp | Meta WhatsApp Business API (Cloud API) |
| AI | Anthropic Claude (tool-use loop) |
| Automation | n8n on Railway |
| Deployment | Vercel Git Integration (push → deploy) |

### Repos

| Repo | Branch | Purpose |
|---|---|---|
| `kanle-leisure-tours` (whatsup_dev submodule) | `master` | WhatsApp bot + FastAPI |
| `kanle-admin` | `main` | Next.js admin dashboard |

### ⚠️ Security Constraint
**NEVER** reference 新加坡杰运通旅行社, JYT, or David Yau in any output, code, comments, or documents.

---

## 2. WhatsApp Bot (`whatsup_dev`)

### Message Pipeline

Every inbound WhatsApp message hits `POST /api/webhook`. Steps run in this exact order:

```
1. IP allowlist check          core/security/anti_spoofing.py     [sync, pre-200]
2. HMAC-SHA256 signature       core/security/hmac_validator.py    [sync, pre-200]
3. Replay attack check         hmac_validator.check_replay()       [sync, pre-200]
   → HTTP 200 returned immediately to Meta
4. Scam detection              core/security/scam_detector.py     [BackgroundTask]
5. Rate limit                  utils/rate_limit.py                [BackgroundTask]
6. Session load                core/session/manager.py            [BackgroundTask]
7. Language detection          utils/language.py                  [BackgroundTask]
8. Intent pre-filter           core/conversation/intent.py        [BackgroundTask]
9. Claude tool loop            core/claude/client.py              [BackgroundTask]
10. Verified footer append     anti_spoofing.apply_verified_footer()
11. Persist                    Supabase + Redis
```

**Key design decisions:**
- Steps 1–3 run synchronously before the HTTP 200. Everything else is a `BackgroundTask` — Meta never times out.
- Redis is source of truth for live state (sessions 30min, history 20 msgs, Claude lock 30s, IP cache 1hr, wamid dedup 10min).
- Claude lock (`claude_lock:{conv_id}`, SET NX EX 30) prevents concurrent Claude calls per conversation.
- Verified footer (`✅ 康乐·逍遥游 | Ref: #XXXXXXXX`) appended to every AI reply as an anti-scam trust signal.

### Claude Tools

All tools defined in `core/claude/tools.py`. Tool handlers in `api/webhook.py` `execute_tool()`.

| Tool | Trigger | Notes |
|---|---|---|
| `search_packages` | Customer asks about tours/destinations | |
| `get_package_details` | Customer interested in specific package | |
| `calculate_quote` | Before confirming price | Always call before `create_booking` |
| `check_availability` | Customer proposes a date | |
| `create_booking` | Customer confirms package + date + pax + email | **customer_email is required** |
| `confirm_booking_payment` | Customer says "PAID BK-XXXXXX" | Sets `pending_verification`, fires admin email |
| `check_booking_status` | Customer asks about booking status | Returns status + tracking URL |
| `get_ar_preview` | Customer wants to preview destination | WebAR 360° link |
| `search_hotels` | Customer asks about accommodation | Reads `batam_hotels` table |
| `search_addons` | Transport, spa, dining, activities | Reads `tour_addons` table |
| `search_transport` | Airport transfers, charter | GoMyHire integration |
| `book_transport` | After customer confirms transport | |
| `search_flights` | Bali only (Batam uses ferry) | Hardcoded mock options |
| `search_worksheets` | Customer asks about educational materials | WaaS vertical |
| `purchase_worksheet` | Customer agrees to buy worksheet | Returns PayNow WS-XXXXXX ref |
| `get_worksheet_download` | Customer says "PAID WS-XXXXXX" | Returns signed download URL |
| `check_sse_membership` | Customer asks about loyalty programme | |
| `search_marketplace` | Vendor products, services | |

**Tool handler pattern:**
```python
# api/webhook.py — execute_tool()
if tool_name == "create_booking":
    booking = await booking_mgr.create(
        customer_id=customer_id,
        conversation_id=conversation_id,
        package_id=tool_input["package_id"],
        travel_date=tool_input["travel_date"],
        adults=tool_input["adults"],
        children=tool_input.get("children", 0),
        total_sgd=quote.total_sgd,
        customer_email=tool_input.get("customer_email"),  # mandatory in schema
        customer_phone=customer_phone,
    )
    # Save to Redis session for payment confirmation fallback
    await session_mgr.update(customer_phone, {
        "pending_booking_id":  booking["id"],
        "pending_booking_ref": booking["payment_ref"],
    })
```

### 3-Level Booking ID Resolution

When `confirm_booking_payment` fires, Claude may not have the booking_id in context. Resolution order:

```python
# 1. Tool input (Claude remembered it)
booking_id = tool_input.get("booking_id")

# 2. DB lookup by BK-XXXXXX ref
if not booking_id and payment_ref:
    b = await booking_mgr.get_by_payment_ref(payment_ref)
    booking_id = b["id"] if b else None

# 3. Redis session fallback
if not booking_id and customer_phone:
    sess = await cache.get_session(customer_phone)
    booking_id = (sess or {}).get("pending_booking_id")
```

---

## 3. Booking Payment Flow

Modelled on the mosque-os pattern. Full end-to-end:

```
Bot                    Customer                Admin
 │                         │                     │
 │── create_booking ───────►                     │
 │   Returns BK-XXXXXX +   │                     │
 │   PayNow instructions   │                     │
 │                         │                     │
 │◄── "PAID BK-A3B4C5" ────│                     │
 │                         │                     │
 │ confirm_booking_payment  │                     │
 │ status → pending_verification                  │
 │ Admin email via Brevo ──────────────────────►  │
 │                         │                     │
 │── "Payment received,    │                     │
 │    verifying..." ───────►                     │
 │                         │                     │
 │                         │  Admin checks bank  │
 │                         │  Clicks "Verify" ───│
 │                         │                     │
 │                         │  POST /api/admin/   │
 │                         │  bookings/[id]/verify
 │                         │                     │
 │                         │  • status → confirmed│
 │                         │  • payment_status → paid
 │                         │  • PDF e-ticket generated
 │                         │  • Uploaded to Supabase Storage
 │                         │  • platform_transaction written
 │                         │                     │
 │◄── WhatsApp: confirmed + PDF doc ───────────── │
 │◄── Email: HTML + PDF attachment ────────────── │
 │                         │                     │
 │ Customer tracks at /booking/BK-A3B4C5          │
 │ Or asks bot: "check BK-A3B4C5"                 │
```

### Payment Status Values

| Value | Meaning |
|---|---|
| `unpaid` | Booking created, no payment reported |
| `pending_verification` | Customer self-reported payment; admin to verify |
| `paid` | Admin verified; booking confirmed |
| `partial` | Partial payment received |
| `refunded` | Payment refunded |

### PDF E-Ticket

Generated in `lib/ticket-pdf.ts` (kanle-admin) using `pdfkit` + `qrcode`.
- A5 format, purple header, booking details grid, embedded QR linking to `/booking/{ref}`
- Uploaded to Supabase Storage bucket `booking-tickets/{ref}.pdf` (public)
- URL stored in `bookings.context.ticket_url`
- Sent via WhatsApp as a document message + email attachment

---

## 4. Admin Dashboard (`kanle-admin`)

### Pages & APIs

| Page | API Routes | Auth | Notes |
|---|---|---|---|
| `/admin` | `GET /api/admin/stats` | Any admin | KPI overview |
| `/admin/bookings` | `GET/PATCH /api/admin/bookings` | Any admin | List, filter, status update |
| | `POST /api/admin/bookings/[id]/verify` | Any admin | Verify payment, send e-ticket |
| | `GET /api/admin/bookings/export` | Any admin | CSV download |
| | `GET /api/admin/bookings/track/[ref]` | **Public** | No auth — used by tracking page |
| `/admin/tenants` | `GET/POST /api/admin/tenants` | **super_admin only** | Tenant CRUD |
| | `PATCH/DELETE /api/admin/tenants/[id]` | **super_admin only** | Edit/delete tenant |
| `/admin/finance` | `GET /api/admin/finance` | Any admin | platform_transactions |
| `/admin/sse` | `GET/POST/PATCH /api/admin/sse` | Any admin | SSE loyalty members |
| `/admin/agents` | `GET /api/admin/agents` | Any admin | Agents with commission totals |
| `/admin/agents/payouts` | `GET/POST/PATCH /api/admin/agents/payouts` | Any admin | Create/mark payout batches |
| `/admin/vendors` | `GET/POST /api/admin/vendors` | Any admin | Vendor management |
| `/admin/worksheets` | Calls whatsup_dev API directly | Any admin | Uses `NEXT_PUBLIC_API_BASE` |
| `/admin/conversations` | `GET /api/admin/conversations` | Any admin | Chat history |
| `/booking/[ref]` | `GET /api/admin/bookings/track/[ref]` | **Public** | Customer-facing tracking page |

### Auth Pattern

```typescript
// Every protected API route:
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;   // returns 401/403 response
  const { session, tenantId } = auth;

  // tenantId === null  →  super_admin, no filter
  // tenantId === "uuid" →  tenant_admin, scope all queries to this tenant
  if (tenantId) query = query.eq("tenant_id", tenantId);
}
```

### Role-Based Navigation

Defined in `lib/session.ts` `ROLE_NAV`:

| Role | Nav Items |
|---|---|
| `super_admin` | Overview, Tenants, Bookings, Vendors, Worksheets, SSE, Agents, Finance, Conversations |
| `tenant_admin` | Overview, Bookings, Vendors, Worksheets, SSE, Agents, Finance, Conversations |
| `school_operator` | Overview, Worksheets, Courses*, Students* *(LMS Phase 2)* |
| `vendor_admin` | Overview, Products*, Orders* *(not yet built)* |

### Bookings Page Features

- Filter by status + payment_status + travel date range
- **"Needs verification"** pill — counts `pending_verification` bookings
- **Verify Payment button** — appears on `pending_verification` bookings; fires verify endpoint
- **Tracking link** — opens `/booking/{ref}` in new tab
- **Export CSV button** — downloads filtered bookings with 15 columns

---

## 5. Multi-Tenancy

Every data table includes a `tenant_id UUID REFERENCES tenants(id)`.

### Tenant Resolution (bot)

```python
# core/tenant/resolver.py
# Inbound webhook → phone_number_id → lookup tenants table → set_tenant()
tenant = await resolver.resolve(phone_number_id)
set_tenant(tenant)  # ContextVar — available anywhere in request scope via get_tenant()
```

### Tenant Configuration Fields

| Field | Purpose |
|---|---|
| `name` / `name_zh` | Display name (EN/ZH) |
| `slug` | URL-safe identifier |
| `whatsapp_number_id` | Meta phone number ID for this tenant's WABA |
| `whatsapp_token` | Meta access token (stored encrypted, never pre-filled in edit form) |
| `ai_persona_name` / `ai_persona_name_zh` | Bot persona name |
| `ai_system_prompt` | Custom system prompt override |
| `platform_fee_pct` | HipyHub platform fee % (default 15) |
| `agent_fee_pct` | Default agent commission % |
| `primary_color` / `logo_url` | White-label branding |
| `plan` / `monthly_fee_sgd` / `plan_expires_at` | Subscription tier |

### Fee Computation

```
gross_amount = booking.total_sgd
platform_fee = gross × tenant.platform_fee_pct / 100
agent_fee    = agent_commissions.commission_sgd  (or gross × tenant.agent_fee_pct / 100)
vendor_payout = gross − platform_fee − agent_fee
```

---

## 6. n8n Workflows (Railway)

Files in `whatsup_dev/n8n/workflows/`. Import via n8n UI.

| File | Trigger | Description |
|---|---|---|
| `01_*.json` | Webhook | Handoff alert to agent |
| `02_*.json` | Webhook | Booking confirmation |
| `03_departure_reminders.json` | Cron (every 15min) | D-3 and D-1 WhatsApp reminders; joins `tenants` table for per-tenant WABA credentials |
| `04_agent_handoff_alert.json` | Webhook (`N8N_WEBHOOK_URL`) | Triggered by Vercel bot on escalation |
| `05_*.json` | Webhook | PDF generation |

**Multi-tenant reminder pattern (`03`):**

```sql
-- Supabase query in n8n includes:
SELECT bookings.*, tenants(whatsapp_number_id, whatsapp_token, name_zh, name)
FROM bookings WHERE travel_date = NOW() + INTERVAL '3 days'
```

```javascript
// n8n Send node uses per-tenant credentials:
url: `https://graph.facebook.com/v18.0/${$json.tenants.whatsapp_number_id || $env.WHATSAPP_PHONE_ID}/messages`
Authorization: `Bearer ${$json.tenants.whatsapp_token || $env.WHATSAPP_TOKEN}`
```

---

## 7. Database Migrations

Location: `whatsup_dev/db/schema/`. Run in Supabase SQL editor in this exact order:

```
001_enums
002_customers
003_agents
004_conversations
005_messages
007_tour_packages   ← MUST run BEFORE 006 (FK constraint)
006_bookings
008_rls_policies
009_security_log
010_expand_destinations
010_grants
011_packages_upsert
012_tenants_vendors
013_sse_loyalty
014_marketplace_orders
015_agent_payouts
016_addons_catalog
017_tour_packages_tenant
018_worksheets
019_worksheet_helpers
020_admin_users
021_tenant_scope
022_booking_verification   ← adds customer_email, verified_at, payment_submitted_at
```

**Notable tables:**

| Table | Purpose |
|---|---|
| `bookings` | Tour bookings; `payment_status` includes `pending_verification` |
| `platform_transactions` | Revenue ledger; written on admin verify |
| `agent_commissions` | Per-booking commission credits |
| `agent_payout_batches` | Grouped commission payouts |
| `sse_members` | Spend-Save-Earn loyalty members |
| `worksheet_purchases` | WaaS purchase records |
| `tenants` | Multi-tenant config |
| `security_log` | Audit log; phone stored as SHA-256 hash (PDPA) |

---

## 8. Environment Variables

### `whatsup_dev` (Vercel — sin1 region)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token |
| `ANTHROPIC_API_KEY` | Claude API key |
| `WHATSAPP_ACCESS_TOKEN` | Default Meta access token (fallback if tenant has none) |
| `WHATSAPP_PHONE_NUMBER_ID` | Default Meta phone number ID (fallback) |
| `WHATSAPP_APP_SECRET` | For HMAC signature verification |
| `PAYNOW_UEN` | PayNow UEN shown in payment instructions |
| `BREVO_API_KEY` | Brevo transactional email |
| `BREVO_SENDER_EMAIL` | From address |
| `BREVO_SENDER_NAME` | From name |
| `ADMIN_NOTIFICATION_EMAIL` | Recipient for "check your bank" admin alerts |
| `APP_URL` | Public base URL (e.g. `https://hipyhub.com`) for tracking links |
| `ADMIN_PANEL_URL` | Admin dashboard URL for links in admin emails |
| `N8N_WEBHOOK_URL` | n8n agent handoff webhook |

### `kanle-admin` (Vercel)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (client-side safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server routes |
| `ADMIN_SESSION_SECRET` | iron-session secret (min 32 chars) |
| `NEXT_PUBLIC_API_BASE` | whatsup_dev Vercel URL — used by worksheets page |
| `BREVO_API_KEY` | Brevo for buyer confirmation emails |
| `BREVO_SENDER_EMAIL` | From address |
| `BREVO_SENDER_NAME` | From name |
| `WHATSAPP_ACCESS_TOKEN` | Default WA token (fallback for verify endpoint) |
| `WHATSAPP_PHONE_NUMBER_ID` | Default WA phone ID (fallback) |
| `APP_URL` | Public base URL for tracking links in emails/WhatsApp |

---

## 9. Supabase Storage Buckets

| Bucket | Access | Purpose | Setup |
|---|---|---|---|
| `booking-tickets` | **Public** | PDF e-tickets | Storage → New bucket → `booking-tickets` → Public: ON |
| `ar-assets` | Public | 360° WebAR equirectangular JPGs | Upload via Supabase dashboard |

**E-ticket path pattern:** `booking-tickets/{BK-XXXXXX}.pdf`

---

## 10. Deployment

### Rules
- **Always deploy via `git push`** → Vercel Git Integration triggers build automatically.
- **Never run `vercel deploy --prod` manually.**
- Read logs: `vercel logs <deployment-url> --follow`
- `whatsup_dev` requires **Vercel Pro** plan — 30s function timeout needed for Claude tool loop.

### Branches

| Repo | Branch | Vercel target |
|---|---|---|
| `whatsup_dev` | `master` | Production |
| `kanle-admin` | `main` | Production |

### Post-deploy checks

1. Ping `GET /api/health` on whatsup_dev — should return `{"status":"ok"}`
2. Check `/admin` loads and stats populate
3. Send a test WhatsApp message to verify bot responds
4. UptimeRobot pings `/api/health` every 5min to reduce cold starts

---

## 11. Key Patterns Reference

### Worksheet Payment Flow

```
Customer: "I want P3 Math worksheet"
→ search_worksheets → purchase_worksheet → PayNow WS-XXXXXX
Customer: "PAID WS-A3B9C2"
→ get_worksheet_download → confirm_and_deliver() → signed Supabase Storage URL
```

### SSE Loyalty Tiers

| Tier | Threshold | save_pct | earn_rate |
|---|---|---|---|
| Bronze | Default | 5% | 1× |
| Silver | S$500 spend | 8% | 1.5× |
| Gold | S$1,500 spend | 10% | 2× |
| Platinum | S$5,000 spend | 15% | 3× |

### Agent Payout Batch Numbering

Format: `PAY-YYYY-MM-NNN` (e.g. `PAY-2026-10-001`). Auto-incremented per month.

### Booking Reference Format

`BK-` + 6 hex chars uppercase (e.g. `BK-A3B4C5`). Generated in `core/booking/manager.py`:
```python
def _payment_ref() -> str:
    return "BK-" + secrets.token_hex(3).upper()
```

### Worksheet Reference Format

`WS-` + 6 hex chars uppercase. Same pattern.

---

## 12. Known Gaps / Pending Work

| Item | Status | Notes |
|---|---|---|
| LMS Phase 2 | Not started | Courses, enrolment, progress tracking (school_operator role) |
| `/admin/agents` page | Only payouts sub-page exists | `payouts` links from dashboard |
| `/admin/crm`, `/admin/settings` | In nav but no page | 404 if clicked |
| `vendor_admin` products/orders pages | Not built | Role exists, nav defined |
| Worksheet purchases in kanle-admin | Calls `NEXT_PUBLIC_API_BASE` | Requires whatsup_dev deployed to work |
| `booking-tickets` Storage bucket | Manual creation required | See §9 |
