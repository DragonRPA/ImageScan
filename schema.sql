-- ============================================================================
-- Supabase Database Universal Dynamic Schema DDL (SSOT)
-- System: Universal Dynamic Schema, Label Template & Print Queue Engine
-- ============================================================================

-- 1. 스키마 메타데이터 테이블 (SSOT)
CREATE TABLE IF NOT EXISTS public.schema_definitions (
    id VARCHAR(64) PRIMARY KEY,
    schema_name VARCHAR(100) NOT NULL,
    key_field VARCHAR(64) NOT NULL,
    key_field_name VARCHAR(100) NOT NULL,
    fields JSONB NOT NULL,
    table_version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 동적 스캔 큐 & 데이터 레코드 테이블
CREATE TABLE IF NOT EXISTS public.scan_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_value VARCHAR(100) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    scan_status VARCHAR(20) DEFAULT 'SCANNED',
    scanned_by VARCHAR(50) DEFAULT 'MOBILE_APP',
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_records_key ON public.scan_records (key_value);
CREATE INDEX IF NOT EXISTS idx_scan_records_data ON public.scan_records USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_scan_records_status ON public.scan_records (scan_status, scanned_at DESC);

-- 3. 백엔드 라벨 서식 템플릿 테이블
CREATE TABLE IF NOT EXISTS public.label_templates (
    id VARCHAR(64) PRIMARY KEY,
    schema_id VARCHAR(64) REFERENCES public.schema_definitions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    paper JSONB NOT NULL,
    elements JSONB NOT NULL,
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 범용 프린트 큐 테이블
CREATE TABLE IF NOT EXISTS public.print_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_record_id UUID REFERENCES public.scan_records(id) ON DELETE SET NULL,
    template_id VARCHAR(64) REFERENCES public.label_templates(id),
    key_value VARCHAR(100) NOT NULL,
    record_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    zpl_payload TEXT NOT NULL,
    print_status VARCHAR(20) DEFAULT 'PENDING',
    print_error TEXT DEFAULT NULL,
    agent_id VARCHAR(100) DEFAULT NULL,
    requested_by VARCHAR(50) DEFAULT 'SYSTEM',
    printed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_print_queue_status ON public.print_queue (print_status, created_at);
CREATE INDEX IF NOT EXISTS idx_print_queue_key ON public.print_queue (key_value);

-- 5. RLS 보안 정책 일괄 적용 (멱등성 보장)
ALTER TABLE public.schema_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- schema_definitions
    DROP POLICY IF EXISTS "Allow all schema_definitions" ON public.schema_definitions;
    CREATE POLICY "Allow all schema_definitions" ON public.schema_definitions FOR ALL USING (true) WITH CHECK (true);

    -- scan_records
    DROP POLICY IF EXISTS "Allow all scan_records" ON public.scan_records;
    CREATE POLICY "Allow all scan_records" ON public.scan_records FOR ALL USING (true) WITH CHECK (true);

    -- label_templates
    DROP POLICY IF EXISTS "Allow all label_templates" ON public.label_templates;
    CREATE POLICY "Allow all label_templates" ON public.label_templates FOR ALL USING (true) WITH CHECK (true);

    -- print_queue
    DROP POLICY IF EXISTS "Allow all print_queue" ON public.print_queue;
    CREATE POLICY "Allow all print_queue" ON public.print_queue FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 6. Supabase Realtime Publication 등록
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.schema_definitions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_records;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.label_templates;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.print_queue;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7. 원자적 DDL 스키마 패치 RPC 마스터 함수
CREATE OR REPLACE FUNCTION public.exec_schema_patch(
    p_schema_id VARCHAR,
    p_schema_name VARCHAR,
    p_key_field VARCHAR,
    p_key_field_name VARCHAR,
    p_fields JSONB,
    p_reset_data BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
BEGIN
    INSERT INTO public.schema_definitions (id, schema_name, key_field, key_field_name, fields, table_version, updated_at)
    VALUES (p_schema_id, p_schema_name, p_key_field, p_key_field_name, p_fields, 1, NOW())
    ON CONFLICT (id) DO UPDATE SET
        schema_name = EXCLUDED.schema_name,
        key_field = EXCLUDED.key_field,
        key_field_name = EXCLUDED.key_field_name,
        fields = EXCLUDED.fields,
        table_version = public.schema_definitions.table_version + 1,
        updated_at = NOW();

    IF p_reset_data THEN
        TRUNCATE TABLE public.print_queue CASCADE;
        TRUNCATE TABLE public.scan_records CASCADE;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', '스키마 및 동적 스캔 큐 패치 완료'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
