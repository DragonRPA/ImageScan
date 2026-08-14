# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.0.0.Build.24] - 2026-08-14 14:00:00 (KST)

### 🖨️ PC 로컬 에이전트 + Supabase 프린트 큐 ZPL 자동 출력 파이프라인 구축

1. **Supabase `print_queue` 테이블 신설** (`schema.sql`)
   - 모바일 → PC 에이전트 간 프린트 큐 역할
   - 상태: `PENDING → PRINTING → PRINTED | ERROR`
   - Realtime publication 등록, RLS 정책(SELECT/INSERT/UPDATE) 적용

2. **PC 로컬 에이전트 신설** (`print-agent/zebra-agent.mjs`)
   - Node.js 단일 파일 스크립트 (외부 의존성: `@supabase/supabase-js` 1개)
   - Supabase Realtime 구독 → PENDING INSERT 이벤트 즉시 감지
   - ZPL 조립 (라벨: **72mm × 40mm**, **Code39**, 203 DPI)
   - TCP:9100으로 Zebra GK-420D 직접 전송
   - 중복 처리 방지: PRINTING 선점 → PRINTED/ERROR 업데이트
   - 재시작 시 기존 PENDING 건 자동 복구

3. **Supabase DB 인증정보 하드코딩** (`supabaseClient.js`)
   - 우선순위: `localStorage → .env → 시스템 상수(하드코딩)`
   - 더 이상 UI에서 DB 연결 정보를 매번 입력하지 않아도 됨

4. **모바일 확정 시 print_queue 자동 등록** (`MobileScannerView.jsx`)
   - `insertPrintQueue()` 추가 - 자산 확정 즉시 큐에 PENDING 등록
   - 큐 등록 성공: `🖨️ 라벨 출력 요청 완료!` 상태 표시

5. **PC 대시보드 프린트 큐 모니터 패널 신설** (`PCDashboardView.jsx`)
   - 실시간 PENDING/PRINTING/PRINTED/ERROR 집계 카드
   - 에이전트 활성 상태 감지 및 표시
   - 최근 30건 출력 이력 테이블 (Realtime 자동 갱신)

## [v1.0.0.Build.23] - 2026-08-14 13:26:41 (KST)

### 🎯 4자리 IMEI DB 자동 검색, 복수 후보 선택기 & PC 바코드 라벨 연동 (`MobileScannerView.jsx`)
1. **단일 유일 매칭 (1:1 매칭 시)**:
   - 음성("오공오이") 또는 타핑으로 입력된 끝 4자리(`5052`)가 DB 내 유일한 1건인 경우, 전체 15자리 IMEI, 자산번호, 시리얼을 100% 자동 완성하여 즉시 저장.
   - Supabase DB 실시간 동기화로 **PC 대시보드 라벨 프린터 ZPL 출력 큐 연동 완료**.
2. **복수 후보 선택 패널 (동일 끝 4자리 장비 2건 이상 존재 시)**:
   - 끝 4자리가 동일한 장비가 복수개 검색될 경우, **`[⚠️ 5052 동일 장비 N건 발견 - 클릭하여 선택]` 모바일 복수 선택 카드 패널** 표출.
   - 현장 작업자가 자산번호, S/N를 확인하고 원하는 장비를 터치하면 해당 정확한 장비로 확정 등록 & PC 라벨 출력 연동!

---

## [v1.0.0.Build.22] - 2026-08-14 13:21:38 (KST)
- **초광각 접사 렌즈 기본 자동 감지 & 음성 인식 1터치 무한 재연결 구축**.
