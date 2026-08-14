# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.0.0.Build.21.Patch1] - 2026-08-14 13:14:30 (KST)

### 🛠️ `handleExportAll is not defined` 원인 100% 원인 제거 완벽 수정 (`MobileScannerView.jsx`)
1. **정확한 오류 원인 완치**:
   - 이전 커밋에서 `MobileScannerView.jsx` 하단 바 렌더링 시 `handleExportAll` 함수 선언부가 일부 잘려서 발생했던 ReferenceError 문제를 100% 원천 수정했습니다.
2. **카메라 및 일체형 4자리/음성 직통 워크스테이션 정상 표출**:
   - 에러 경계선 화면 없이 **접사 카메라 조준 화면 + 4자리 입력 + 음성 상시 ON** 메인 화면이 화면에 깨끗하게 정상 표출됩니다.

---

## [v1.0.0.Build.21] - 2026-08-14 12:52:21 (KST)
- **메인 화면 일체형 4자리 IMEI, 접사 카메라, 플래시 & 상시 음성 워크스테이션 구축**.
