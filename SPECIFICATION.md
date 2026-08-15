# 🏛️ [기능 명세서] UBUS DragonRPA & 통합 자산 라벨 자동화 시스템 (SPECIFICATION.md)

> **전사 시스템 개발 표준 헌장 제1조(최우선 개발 사명)**  
> *"최대 편리함과 담당자의 노력 대비 효과와 이익(효익)을 합쳐서, 최대 편익에 이르는 시스템 개발이 우리의 목적이다."*

---

## 📌 1. 시스템 개요 (System Overview)

- **시스템 명칭**: UBUS DragonRPA & Zebra Label Automation System
- **시스템 목적**: 
  - ERP 자산 관리, 입고/출고/검수 업무의 100% 무인화.
  - 블루투스 바코드 스캔 시 0.1초 DB 매칭 및 1초 Zebra 고속 직통 라벨 출력.
  - 위치 무관(Position-Agnostic) 엑셀 파싱 및 웹 브라우저(Edge/Chrome) 자동 조작.
- **아키텍처 구조**:
  - **웹/클라우드 SPA (SSOT 두뇌)**: 설치 불필요 (React + Vite + Supabase Cloud)
  - **PC 로컬 에이전트 (손발)**: `UBUS_DragonRPA_Agent.exe` (41.2 MB 단 1개 독립 상주)

---

## 🗄️ 2. asset 테이블 15대 정규 자산 스키마 명세

| 번호 | 한글 헤더명 | 영문 컬럼명 | 데이터 타입 | 제약 조건 | 설명 및 용도 |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **자산번호** | `asset_no` | VARCHAR(50) | **PRIMARY KEY** | 회사의 고유 자산 관리번호 (바코드 인쇄 주 대상, 중복 불가 식별자) |
| **2** | **대분류** | `category_major` | VARCHAR(20) | NULLABLE | 자산 대분류 카테고리 (예: 노트북, 스마트폰, 계측기 등 20자 이하) |
| **3** | **제품명** | `product_name` | VARCHAR(100) | NULLABLE | 제품 명칭 (예: 갤럭시 S24, ThinkPad X1 Carbon 등) |
| **4** | **모델명** | `model_name` | VARCHAR(100) | NULLABLE | 제조사 모델 코드 (예: SM-S921N, 21CD001LKR 등) |
| **5** | **제조번호(시리얼)** | `serial_no` | VARCHAR(50) | INDEX | 제조사 기기 일련번호 (S/N) |
| **6** | **자산상태** | `asset_status` | VARCHAR(50) | NULLABLE | 자산 상태 (임대가능, 임대중, 출고완료, 수리대기, 수리중, 사내사용중, 입고검수중, 팩토리상품, 출고검수중, 교정중) |
| **7** | **회수율** | `earning_ratio` | INTEGER | NULLABLE | 취득가 대비 매출 (회수율 %) |
| **8** | **선반번호** | `shelf_no` | VARCHAR(50) | NULLABLE | 물류/창고 보관 로케이션 위치 (예: A-01-02) |
| **9** | **옵션** | `asset_option` | VARCHAR(100) | NULLABLE | 단말 옵션 및 추가 사양 (예: 512GB, LTE/5G) |
| **10**| **교정일자** | `calibration_date`| VARCHAR(50) | NULLABLE | 장비/계측기 정기 교정일자 |
| **11**| **MAC wlan** | `mac_wlan` | VARCHAR(30) | NULLABLE | 무선 Wi-Fi MAC 주소 |
| **12**| **MAC lan** | `mac_lan` | VARCHAR(30) | NULLABLE | 유선 이더넷 LAN MAC 주소 |
| **13**| **IMEI** | `imei` | VARCHAR(50) | INDEX | 이동통신 단말기 고유식별번호 (15자리) |
| **14**| **구성요소(사양)** | `components` | VARCHAR(255) | NULLABLE | CPU, RAM, SSD, 어댑터 등 상세 하드웨어 구성요소 |
| **15**| **비고** | `remark` | VARCHAR(255) | NULLABLE | 자산 특이사항 메모 |

---

## 📑 3. 라벨 인쇄 및 디자이너 엔진 명세

- **지원 프린터**: Zebra GK420d, ZD420D, ZT411 (203 DPI)
- **출력 프로토콜**:
  - `winspool.Drv` RAW P/Invoke 및 Direct TCP/IP (Port 9100)
  - Web Serial API (Chrome/Edge 브라우저 직통 지원)
- **다중 서식 프리셋**:
  1. `자산 대형 (72×40mm)`: 1D Barcode + 4대 헤더
  2. `자산 소형 QR (50×25mm)`: 2D QR + 자산번호/시리얼
  3. `제조번호 QR (60×30mm)`: 시리얼 특화 바코드
  4. `사용자 정의 서식`: 시각적 캔버스 자유 배치 및 영구 저장
- **Zero-Focus 블루투스 무인 출력**:
  - 화면 포커스와 무관하게 블루투스 바코드 스캔 감지(<60ms) $\to$ 0.1초 DB 매칭 $\to$ 1초 즉시 라벨 인쇄.

---

## 🤖 4. 범용 RPA 시나리오 & 실행기 명세

- **지원 브라우저**: Microsoft Edge, Google Chrome
- **3대 기본 내장 시나리오**:
  1. `입고 자동 등록`: 엑셀 데이터 $\to$ ERP 입고 폼 1행씩 자동 타이핑 & 저장 & 알럿 자동 수락
  2. `자산 정보 수정`: 엑셀 데이터 기반 옵션, 선반번호, 교정일자, 비고 일괄 수정
  3. `출고 검수 자동화`: 출고의뢰번호 조회 $\to$ 실물 스캔 시리얼 1:1 대조 및 검수 승인 마감
- **타겟 요소 검출 네비게이터 (Live Inspector)**:
  - F12 없이 웹 화면에서 마우스로 요소를 콕 찍으면 견고한 선택자(ID/CSS/XPath) 및 iframe 자동 감지.
- **4대 비상 대안 (CSS 미검출 시 Fallback)**:
  1. `PIXEL_MATCH`: 0MB 순수 초경량 2D 픽셀 템플릿 매칭 (20ms 검색)
  2. `JS_INJECT`: JavaScript DOM 강제 주입
  3. `KEYBOARD_TAB`: WindowsInput 키보드 탭/엔터 시퀀스
  4. `COORDINATE_CLICK`: (X, Y) 픽셀 좌표 직접 클릭

---

## 🔐 5. 보안 및 관리자 게이트키퍼 명세

- **초기 기본 비밀번호**: **`0000`**
- **권한 분리**:
  - **일반 실무**: `데이터 목록`, `RPA 실행`, `라벨 서식 디자인`, `프린트 큐` (자유 사용)
  - **관리자 영역**: `RPA 시나리오 편집기`, `스키마 빌더` (비밀번호 필수)
- **세션 제어**: 세션 스토리지 인증 유지, 상단 원클릭 수동 잠금 및 비밀번호 변경 지원.
