# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.0.0.Build.15] - 2026-08-14 12:25:08 (KST)

### 🛠️ 전면 셀카(Selfie) 카메라 필터링 및 후면 물리 렌즈 100% 가동 (`MobileScannerView.jsx`)
1. **전면 셀카 카메라 차단 파이프라인**:
   - `navigator.mediaDevices.enumerateDevices()` 탐색 시 전면 셀카 카메라(`front`, `user`, `selfie`, `전면`)를 100% 필터링 차단.
2. **후면 렌즈 전용 매핑**:
   - 오직 갤럭시 S24 후면에 달린 **후면 메인 광각 / 후면 초광각 접사 / 후면 3배 망원 렌즈**만 정확히 매핑하여 스위칭되도록 수정.

---

## [v1.0.0.Build.14] - 2026-08-14 12:22:37 (KST)
- **안드로이드 카메라 'Could not start video source' 오류 완벽 수정**.
