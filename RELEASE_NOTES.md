# 릴리즈 노트 (RELEASE_NOTES.md)

## [v1.0.0.Build.14] - 2026-08-14 12:22:37 (KST)

### 🛠️ 안드로이드 카메라 'Could not start video source' 오류 완벽 수정 (Robust Camera Fallback)
1. **다중 바인딩 폴백 파이프라인 (Multi-Level Fallback Pipeline)**:
   - 특정 물리 렌즈 바인딩 시 과도한 고해상도 제약 조건(`min: 1920`)으로 인해 안드로이드 OS에서 `Could not start video source` 에러가 발생하던 현상을 완벽 수정.
2. **하드웨어 릴리즈 100ms 지연 및 유연 해상도 적용**:
   - 기존 카메라 트랙을 닫은 후 100ms 대기하여 안드로이드 하드웨어 자원을 완전히 반납한 뒤, 지원되는 최적 해상도로 부드럽게 렌즈를 스위칭합니다.

---

## [v1.0.0.Build.13] - 2026-08-14 12:20:27 (KST)
- **갤럭시 S24 후면 3개 물리 카메라 렌즈 개별 스위칭 엔진 탑재 (`MobileScannerView.jsx`)**.
