# 개발 요구사항 및 완료 상황 기록 (dev_temp.md)

- **마지막 업데이트**: 2026-08-14 12:09:09 (KST)
- **목표 버전**: v1.0.0.Build.12
- **GitHub 저장소**: https://github.com/DragonRPA/ImageScan
- **배포 주소**: https://DragonRPA.github.io/ImageScan/

## 요구사항 요약 (모바일 웹 카메라 초점/플래시 선명도 보정 & ZPL Direct 인쇄 & 영구 저장)

1. **📷 웹 카메라 초점/플래시/선명도 획기적 강화 (Blur Resolution Engine)**:
   - `focusMode: 'continuous'` (연속 접사 자동 초점) 렌즈 제어 강제 적용.
   - `[🎯 초점 재조정]` 리셋 버튼 & 수동 초점 거리 조절 지원.
   - `[🔦 플래시 켜기/끄기]` 스마트폰 LED 조명 제어 (`torch: true`).
   - `3840x2160` 4K / 1080p Ultra-HD 비디오 센서 고정.
   - 3x3 Laplacian Sharpening Convolution Filter로 흐린 윤곽선 200% 칼날 보정.

2. **🖨️ ZPL (Zebra Programming Language) 열전사 팝업 없는 직통 인쇄**:
   - 윈도우 인쇄 대화상자 없이, 브라우저에서 USB/Serial 연결된 라벨 프린터로 ZPL II 커스텀 바코드 명령어(`^XA...^XZ`)를 직접 전송하여 0.05초 만에 직통 출력.

3. **💾 DB 연동 정보 & 프린터 오프셋 설정 100% 영구 보존**:
   - Supabase URL/Key, X/Y 오프셋, 폰트 크기, 바코드 높이, 인쇄 모드가 새로고침/재접속 시에도 절대로 지워지지 않도록 영구 보존.
