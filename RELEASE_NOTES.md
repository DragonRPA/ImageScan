# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.0.0.Build.10] - 2026-08-14 11:14:07 (KST)

### 🖨️ PC 연결 프린터 목록 확인 가이드 및 WebUSB 프린터 감지 모달 구축 (`PrinterGuideModal.jsx`)
1. **브라우저 인쇄 창(Print Dialog) 자동 프린터 목록 동기화**:
   - `[Code 39 라벨 인쇄]` 또는 `[테스트 라벨 1장 인쇄]` 클릭 시 브라우저 인쇄 창의 **'대상 (Destination)'** 드롭다운 메뉴에 Windows PC에 설치된 모든 프린터 드라이버(빅솔론, 지브라, 엑스프린터, 가덱스, 세우 등)가 자동으로 노출됩니다.
2. **WebUSB 직접 연결 라벨 프린터 감지**:
   - USB 케이블로 직접 연결된 라벨 프린터를 웹 브라우저(Chrome, Edge)에서 직접 탐색하는 WebUSB 감지 기능 제공.
3. **라벨 3초 인쇄 설정 안내**:
   - 인쇄 창 여백(None) 및 배율(Fit to printable area) 설정 팁 가이드 제공.

---

## [v1.0.0.Build.9] - 2026-08-14 11:11:00 (KST)
- **Supabase 대시보드 URL 자동 감지 및 API URL 100% 자동 변환 (Auto URL Normalizer)**.

## [v1.0.0.Build.8] - 2026-08-14 11:08:35 (KST)
- **실시간 작업 진행률(Progress Bar `0%` ➔ `100%`) 및 명확한 성과 안내 모달 구축**.
