# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.0.0.Build.3] - 2026-08-14 10:42:42 (KST)

### 📦 400건의 기본 시드 데이터 (Seed Data) 내장 및 DB 자동 입력 스크립트 제공
1. **Supabase DB 일괄 삽입용 SQL 스크립트 생성 (`seed_data.sql`)**:
   - 요청해주신 400건의 장비 데이터(`TEST0001` ~ `TEST0400`) 전체를 Supabase `imei_scans` 테이블에 일괄 삽입(Batch Insert)할 수 있는 SQL 구문을 생성하였습니다.
   - Supabase 콘솔 **SQL Editor**에서 1초 만에 실행하여 DB 데이터를 채울 수 있습니다.

2. **웹 대시보드 기본 데이터 내장 (`src/data/initialData.json`)**:
   - Supabase 연동 전이거나 DB가 비어있는 상태에서도 PC 대시보드에서 즉시 400건의 데이터 검색, 엑셀 내보내기, Code 39 라벨 출력을 테스트할 수 있도록 기본 탑재하였습니다.

---

## [v1.0.0.Build.2] - 2026-08-14 10:36:12 (KST)

### ⚡ 초고속 실시간 자동 라벨 인쇄 모드 추가 (Auto Scan-to-Print Mode)
- PC 대시보드에서 `자동 라벨 인쇄 [ON]` 선택 시 핸드폰 스캔 0.1초 후 PC 라벨 프린터 자동 팝업 및 출력.

---

## [v1.0.0.Build.1] - 2026-08-14 10:35:00 (KST)

### 🚀 신규 추가 기능 (New Features)
1. **모바일 카메라 실시간 무버튼 OCR 감지 (Hands-Free)**
2. **PC 실시간 대시보드 (Supabase Realtime Sync)**
3. **PC 데이터 파일 내보내기 (Excel / CSV Exporter)**
4. **PC Code 39 라벨 프린터 출력 제어 ([이미지 1] 1:1 디스플레이)**
