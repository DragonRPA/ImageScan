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

-- ============================================================================
-- Print Queue Table: Mobile → PC Agent ZPL Label Print Pipeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.print_queue (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 자산 정보 (모바일에서 확정한 자산)
    asset_no      VARCHAR(100) NOT NULL,              -- 관리번호 e.g., 'TEST0001'
    imei          VARCHAR(100) NOT NULL,              -- IMEI e.g., '351379300225052'
    mac_address   VARCHAR(100) DEFAULT '',            -- MAC Address
    serial_no     VARCHAR(100) DEFAULT '',            -- 시리얼 번호

    -- 인쇄 제어 필드
    print_status  VARCHAR(20)  DEFAULT 'PENDING',     -- 'PENDING' | 'PRINTING' | 'PRINTED' | 'ERROR'
    print_error   TEXT         DEFAULT NULL,          -- 에러 발생 시 메시지 기록
    printed_at    TIMESTAMPTZ  DEFAULT NULL,          -- 출력 완료 일시
    agent_id      VARCHAR(100) DEFAULT NULL,          -- 처리한 에이전트 식별자 (hostname)

    -- 메타
    requested_by  VARCHAR(100) DEFAULT 'MOBILE',      -- 요청 발신 출처
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Indexes for agent polling efficiency
CREATE INDEX IF NOT EXISTS idx_print_queue_status     ON public.print_queue(print_status);
CREATE INDEX IF NOT EXISTS idx_print_queue_created_at ON public.print_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_queue_imei       ON public.print_queue(imei);

-- Enable RLS
ALTER TABLE public.print_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Idempotent - DROP IF EXISTS)
DROP POLICY IF EXISTS "Allow anon read all print_queue" ON public.print_queue;
CREATE POLICY "Allow anon read all print_queue"
    ON public.print_queue FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert print_queue" ON public.print_queue;
CREATE POLICY "Allow anon insert print_queue"
    ON public.print_queue FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update print_queue" ON public.print_queue;
CREATE POLICY "Allow anon update print_queue"
    ON public.print_queue FOR UPDATE USING (true);

-- Enable Supabase Realtime for print_queue (agent subscribes to this)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.print_queue;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
