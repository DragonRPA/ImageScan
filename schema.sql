-- ============================================================================
-- Supabase Database Schema DDL (SSOT)
-- System: Mobile Camera OCR Scanner & PC Label Printing System
-- Schema matching Image 2 columns: 자산번호 (asset_no), IMEI (imei), MAC Address (mac_address), 시리얼 (serial_no)
-- ============================================================================

-- Create Table imei_scans
CREATE TABLE IF NOT EXISTS public.imei_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_no VARCHAR(100) NOT NULL,            -- 자산번호 (관리번호) e.g., '11112222'
    imei VARCHAR(100) NOT NULL,                -- IMEI e.g., '351379300225052'
    mac_address VARCHAR(100) DEFAULT '',       -- MAC Address e.g., '4CEBB0B57A51'
    serial_no VARCHAR(100) DEFAULT '',         -- 시리얼 e.g., 'R5KL60F0CZW'
    scanned_at TIMESTAMPTZ DEFAULT NOW(),      -- 스캔 일시
    status VARCHAR(50) DEFAULT 'COMPLETED',    -- 상태 ('COMPLETED', 'EXPORTED', 'PRINTED')
    device_info VARCHAR(255) DEFAULT 'MOBILE_OCR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_imei_scans_asset_no ON public.imei_scans(asset_no);
CREATE INDEX IF NOT EXISTS idx_imei_scans_imei ON public.imei_scans(imei);
CREATE INDEX IF NOT EXISTS idx_imei_scans_scanned_at ON public.imei_scans(scanned_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.imei_scans ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated SELECT / INSERT / UPDATE / DELETE policies (Idempotent DDL)
DROP POLICY IF EXISTS "Allow anon read all imei_scans" ON public.imei_scans;
CREATE POLICY "Allow anon read all imei_scans" ON public.imei_scans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert imei_scans" ON public.imei_scans;
CREATE POLICY "Allow anon insert imei_scans" ON public.imei_scans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update imei_scans" ON public.imei_scans;
CREATE POLICY "Allow anon update imei_scans" ON public.imei_scans FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon delete imei_scans" ON public.imei_scans;
CREATE POLICY "Allow anon delete imei_scans" ON public.imei_scans FOR DELETE USING (true);

-- Enable Supabase Realtime for imei_scans table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.imei_scans;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
