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

## 🗄️ 2. 12대 표준 자산 & RPA 스키마 명세

| 필드 ID | 표준 헤더명 | 속성/타입 | 제약 조건 | 유사어 및 지원 별칭 | 비즈니스 용도 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`asset_no`** | **자산번호** | VARCHAR(50) | **PRIMARY KEY** | `자산번호`, `asset_no`, `관리번호`, `바코드` | 고유 식별 키 (필수) |
| **`product_name`** | **제품명** | VARCHAR(100) | NULLABLE | `제품명`, `product_name`, `품명`, `품목명` | 제품 명칭 |
| **`model_name`** | **모델명** | VARCHAR(100) | NULLABLE | `모델명`, `model_name`, `MODEL`, `M/N` | 기기 모델명 |
| **`serial_no`** | **제조번호(시리얼)** | VARCHAR(50) | INDEX | `제조번호`, `시리얼`, `serial_no`, `S/N` | 바코드/QR 출력 대상 |
| **`shelf_no`** | **선반번호** | VARCHAR(50) | NULLABLE | `선반번호`, `shelf_no`, `선반`, `위치` | 물류 선반 위치 |
| **`asset_status`** | **자산상태** | VARCHAR(50) | NULLABLE | `자산상태`, `asset_status`, `상태`, `status` | 대여가능/대여중/수리중 |
| **`asset_option`** | **옵션** | VARCHAR(100) | NULLABLE | `옵션`, `asset_option`, `OPTION`, `사양` | 기기 사양 옵션 |
| **`calibration_date`**| **교정일자**| VARCHAR(50) | NULLABLE | `교정일자`, `calibration_date`, `교정일` | 계측기 교정 일자 |
| **`remark`** | **비고** | VARCHAR(255) | NULLABLE | `비고`, `remark`, `메모`, `특이사항` | 특이사항 메모 |
| **`mac_wlan`** | **MAC wlan** | VARCHAR(30) | NULLABLE | `MAC wlan`, `mac_wlan`, `wlan mac`, `무선 mac` | 무선 네트워크 MAC |
| **`mac_lan`** | **MAC lan** | VARCHAR(30) | NULLABLE | `MAC lan`, `mac_lan`, `lan mac`, `유선 mac` | 유선 네트워크 MAC |
| **`components`** | **구성요소** | VARCHAR(255) | NULLABLE | `구성요소`, `components`, `스펙`, `storage` | 스토리지/메모리 사양 |

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
