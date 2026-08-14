# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.0.0.Build.2] - 2026-08-14 10:36:12 (KST)

### ⚡ 초고속 실시간 자동 라벨 인쇄 모드 추가 (Auto Scan-to-Print Mode)
- **모바일 ➔ PC 자동 즉시 라벨 출력 연결**:
  - PC 대시보드에서 `자동 라벨 인쇄 [ON]` 스위치를 켜면, 작업자가 핸드폰으로 장비의 IMEI/라벨을 스캔하는 즉시 **PC에 연결된 라벨 프린터로 0.1초 만에 [이미지 1] 라벨이 자동 팝업 및 인쇄**됩니다.
  - 작업자가 PC에 가서 버튼을 누르거나 조작할 필요조차 없는 완전 자동 라벨링(Zero-Touch Labeling) 파이프라인 완성.

---

## [v1.0.0.Build.1] - 2026-08-14 10:35:00 (KST)

### 🚀 신규 추가 기능 (New Features)
1. **모바일 카메라 실시간 무버튼 OCR 감지 (Hands-Free)**:
   - 모바일 웹 브라우저 후면 카메라(`getUserMedia`) 연결 및 ROI 타겟팅 가이드 박스 overlay.
   - 300ms 간격 비동기 프레임 Grab & Canvas 이진화(Contrast Binarization) 전처리.
   - `Tesseract.js` WASM 엔진 기반 IMEI(15자리), MAC Address(12자리 Hex), 시리얼 번호, 자산번호 정규식 실시간 감지.
   - 감지 성공 시 음향(비프음) / 진동(Haptic) / 초록색 펄스 시각 피드백 제공.
   - 중복 감지 방지(1.5초 Cooldown 디바운싱) 및 수동 IMEI 추가 기능.

2. **PC 실시간 대시보드 (Supabase Realtime Sync)**:
   - Supabase Realtime 채널을 통해 모바일에서 스캔된 IMEI 데이터가 PC 화면에 0.1초 즉시 동기화 수집.
   - [이미지 2] 엑셀 스프레드시트 컬럼과 100% 동일한 DB 데이터 뷰 (`자산번호`, `IMEI`, `MAC Address`, `시리얼`, `스캔일시`).
   - 다중 선택, 실시간 검색 필터, 수동 편집 및 개별/일괄 삭제 기능.

3. **PC 데이터 파일 내보내기 (File Exporter)**:
   - [이미지 2] 컬럼 포맷 그대로 Excel (`.xlsx`) 및 한글 깨짐 방지 UTF-8 BOM CSV 내보내기 기능.

4. **PC Code 39 라벨 프린터 출력 제어 (Label Printer Controller)**:
   - [이미지 1] 실물 라벨 서식과 1:1 동일한 우측 정렬 텍스트 (`관리번호`, `시리얼`, `MAC`, `IMEI`) 인쇄 프리뷰.
   - 하단 자산번호(`asset_no`) 기반 **Code 39 (CODE39)** 바코드 체계 (`*11112222*`) 자동 생성 (JsBarcode).
   - `@media print` CSS 기반 PC 연결 라벨 프린터(빅솔론, 지브라, 엑스프린터 등) 출력 제어 (`window.print()`).
