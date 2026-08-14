# 개발 요구사항 및 완료 상황 기록 (dev_temp.md)

- **마지막 업데이트**: 2026-08-14 10:38:23 (KST)
- **완료 버전**: v1.0.0.Build.2
- **GitHub 저장소**: https://github.com/DragonRPA/ImageScan (main 브랜치 푸시 완료)

## Supabase 프로젝트 정보
- **프로젝트명**: `ImageScan`
- **DB Password**: `zCySEBnOXmCLs8N0` (기억 등록 완료)

## 완료된 구현 항목 (100% Complete)
1. [x] **모바일 웹 실시간 무버튼 OCR 스캐너**:
   - `AutoCameraScanner.jsx`: continuous frame loop (300ms) + Canvas preprocessing.
   - Tesseract.js WASM + IMEI(15자리), MAC, Serial 정규식 정제.
   - 비프음 / 진동 / 펄스 피드백.
2. [x] **PC 실시간 대시보드 (Supabase Realtime Sync)**:
   - `PCDashboard.jsx`: 모바일 스캔 0.1초 동기화.
   - [이미지 2] 컬럼 1:1 일치 (`자산번호`, `IMEI`, `MAC Address`, `시리얼`).
3. [x] **모바일 스캔 ➔ PC 실시간 자동 라벨 인쇄 (Auto Scan-to-Print)**:
   - `PCDashboard.jsx`: `자동 라벨 인쇄 [ON]` 선택 시 핸드폰 스캔 0.1초 후 PC 라벨 프린터 자동 출력.
4. [x] **PC 데이터 파일 내보내기 (File Exporter)**:
   - `FileExportModal.jsx`: Excel (`.xlsx`) & CSV (UTF-8 BOM) 다운로드.
5. [x] **PC 라벨 프린터 출력 제어 (이미지 1 명세 & Code 39)**:
   - `LabelPrintModal.jsx`: [이미지 1] 1:1 구현 (`관리번호`, `시리얼`, `MAC`, `IMEI`).
   - 하단 `*asset_no*` **Code 39 (CODE39)** 바코드 생성 (`barcode39.js`).
   - `@media print` CSS 기반 라벨 인쇄 제어 (`window.print()`).
6. [x] **Supabase DB DDL**:
   - `schema.sql`: `imei_scans` 테이블, 인덱스, RLS 정책, Realtime 게시 DDL.
