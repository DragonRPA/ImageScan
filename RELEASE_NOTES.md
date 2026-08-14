# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.0.0.Build.11] - 2026-08-14 11:28:33 (KST)

### 📱 스마트 광역 자동 텍스트 영역 추적 & 핀포인트 타겟 하이라이트 구축 (Smart Auto-Localization)
1. **편안한 조준 광역 스캐닝 영역 (Zero-Align Comfort Zone)**:
   - 미세 상자에 맞출 필요 없이, 기기 뒷면 전체를 편안하게 비추기만 하면 80% 광역 탐색 영역에서 실시간 자동 추적.
2. **Tesseract PSM 11 흩어진 미세 텍스트 자동 영역 검출 (Sparse Text Auto Region)**:
   - 글자 위치가 상단, 중앙, 하단 어느 곳에 있든 1080p 고해상도 풀프레임에서 `IMEI:351379300226456` 글자를 자동으로 찾아서 정밀 추출.
3. **실시간 감지 위치 핀포인트 타겟 하이라이트 (Live Pinpoint Bounding Box)**:
   - IMEI 감지 성공 시 화면 상의 실제 글자 위치에 **초록색 핀포인트 박스 (Target Highlight)**가 실시간 팝업되어 감지 지점을 직관적으로 확신.

---

## [v1.0.0.Build.10] - 2026-08-14 11:14:07 (KST)
- **PC 연결 프린터 목록 확인 가이드 & WebUSB 프린터 감지 모달 구축 (`PrinterGuideModal.jsx`)**.

## [v1.0.0.Build.9] - 2026-08-14 11:11:00 (KST)
- **Supabase 대시보드 URL 자동 감지 및 API URL 100% 자동 변환 (Auto URL Normalizer)**.

## [v1.0.0.Build.8] - 2026-08-14 11:08:35 (KST)
- **실시간 작업 진행률(Progress Bar `0%` ➔ `100%`) 및 명확한 성과 안내 모달 구축**.
