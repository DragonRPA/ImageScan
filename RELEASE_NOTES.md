# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.2.0.Build.1] - 2026-08-15 12:35:00 (KST)

### 🏛️ 범용 동적 스키마 빌더 & 3대 바코드(Code39/128/QR) & 백엔드 라벨 서식 통합

1. **글로벌 헌장 3.1 무수식어 건조한 명사·동사 UI 표준화 영구 학습 (`AGENTS.md`)**
   - 형용사, 수식어, 불필요한 가이드 텍스트 전면 배제 및 건조한 명사(+동사) 단일 표준 엄격 강제

2. **범용 동적 스키마 빌더 & DDL 자동 패치 엔진 신설 (`SchemaBuilderTab.jsx`, `dynamicSchema.js`)**
   - 사용자 정의 헤더 자유 추가/수정/삭제 및 필수 키 인덱스(Primary Key) 라디오 지정
   - `exec_schema_patch` RPC 함수 및 동적 DDL 패치 트랜잭션 구축

3. **3대 바코드 & QR 코드 엔진 & 하단 텍스트 토글 지원 (`labelTemplate.js`, `LabelDesignerTab.jsx`)**
   - `Code 39`, `Code 128`, `QR Code` 3종 선택 지원
   - `[v] 하단 텍스트 표시` 체크박스로 바코드 선만 인쇄할지 하단 텍스트를 함께 인쇄할지 즉시 제어
   - Supabase `label_templates` 테이블 백엔드 동기화 (전사 기기 100% 공유)

4. **모바일 스캔 큐 & 범용 프린트 큐 파이프라인 개편 (`schema.sql`, `supabaseClient.js`, `zebra-agent.cjs`)**
   - `scan_records` 테이블 신설 및 스키마 기반 동적 수집/검색 지원
   - `print_queue`에 사전 컴파일된 `zpl_payload` 지원 $\to$ PC 에이전트(Zebra GK-420D)로 즉시 무변형 직통 인쇄

---

## [v1.1.0.Build.1] - 2026-08-15 12:05:00 (KST)

### 🎨 PC 라벨 서식 디자이너 (Visual Label Designer) 탭 신설 & 드래그 앤 드롭 캔버스 구축

1. **PC 대시보드 3대 전문 탭 네비게이션 체계 도입** (`PCDashboardView.jsx`)
   - `[라벨 서식 디자이너]` (신규) : 비주얼 라벨 템플릿 드래그 & 드롭 에디터
   - `[스캔 데이터 목록]` : 수집된 IMEI 및 스캔 이력 조회/엑셀 내보내기 / 오프셋 조정
   - `[프린트 큐 모니터]` : 실시간 대기/출력/오류 큐 감시 및 통계

2. **비주얼 라벨 캔버스 (Drag & Drop Canvas Editor)** (`LabelDesignerTab.jsx`)
   - 72mm × 40mm(또는 사용자 지정 규격) 실물 비율 캔버스 제공
   - 스키마 필드(관리번호, IMEI, S/N, MAC, 스캔일시, Code39 바코드, 구분선, 고정텍스트) 온/오프 체크박스
   - 캔버스 위 각 항목을 마우스로 자유롭게 클릭 & 드래그하여 X, Y 위치 배치 (0.25mm 격자 자동 스냅)
   - 선택 객체 속성 편집기: 폰트 크기(Pt), 접두어 문구, 바코드 높이/대상 필드 실시간 조정

3. **실시간 ZPL II 동적 컴파일 & 1:1 인쇄 시뮬레이션** (`labelTemplate.js`, `zplPrinter.js`)
   - 캔버스 배치 상태를 실시간 ZPL II 명령어로 자동 컴파일 및 텍스트 뷰어 제공
   - [서식 템플릿 저장] 시 로컬스토리지(SSOT)에 영구 보존되어 브라우저 새로고침 후에도 100% 복원
   - [🖨️ 테스트 1장 인쇄] 클릭 시 PC 에이전트(Zebra GK-420D)로 즉시 테스트 라벨 전송 연동

---

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
