-- =============================================================
-- BACKFILL: Set tenant_id on tour_packages + create storage bucket
-- Tenant: f4826b10-5c91-4024-a8fb-13cebfd8f6d4
-- Run in Supabase SQL Editor
-- =============================================================

-- Step 1: Verify tenant exists before backfill
SELECT id, name, slug, whatsapp_number_id, active
FROM tenants
WHERE id = 'f4826b10-5c91-4024-a8fb-13cebfd8f6d4';

-- Step 2: Backfill tenant_id on all tour_packages that have no tenant assigned
UPDATE tour_packages
SET tenant_id = 'f4826b10-5c91-4024-a8fb-13cebfd8f6d4'
WHERE tenant_id IS NULL;

-- Verify backfill
SELECT tenant_id, COUNT(*) as count FROM tour_packages GROUP BY tenant_id;

-- Step 3: Create booking-tickets storage bucket (used by verify endpoint for PDF e-tickets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-tickets', 'booking-tickets', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Verify bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'booking-tickets';

-- Step 4: Check whatsapp_number_id — if NULL, update it to the correct Meta WABA phone_number_id
-- (Get this value from Meta Business Suite → WhatsApp → Phone numbers)
-- Example: UPDATE tenants SET whatsapp_number_id = '123456789012345' WHERE id = 'f4826b10-5c91-4024-a8fb-13cebfd8f6d4';
SELECT id, name, whatsapp_number_id FROM tenants WHERE id = 'f4826b10-5c91-4024-a8fb-13cebfd8f6d4';
