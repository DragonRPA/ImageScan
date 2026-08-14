# 개발 요구사항 및 완료 상황 기록 (dev_temp.md)

- **마지막 업데이트**: 2026-08-14 11:26:59 (KST)
- **목표 버전**: v1.0.0.Build.11
- **GitHub 저장소**: https://github.com/DragonRPA/ImageScan
- **배포 주소**: https://DragonRPA.github.io/ImageScan/

## 요구사항 요약 (광역 자동 텍스트 영역 추적 & 고해상도 OCR)

1. **📱 모바일: 광역 자동 텍스트 영역 추적 (Broad-Field Auto-Localization)**:
   - 작은 상자에 미세 조준할 필요 없이, 카메라를 기기 뒷면에 **편안한 거리에 비추기만 하면 80% 광역 영역 자동 추적**.
   - 1080p 고해상도 비디오 프레임 추출.
   - Tesseract `PSM 6` & `PSM 11` (Sparse Text Detection - 흩어진 미세 텍스트 자동 영역 검출) 파이프라인 가동.
   - 감지 성공 시 화면 상의 실제 IMEI 글자 위치에 **초록색 핀포인트 타겟 박스 (Target Highlight)** 팝업.

2. **🖥️ PC: 라벨 프린터 오프셋(Offset) 정밀 교정 & 생산 KPI 중심 화면**:
   - `출력 대기 IMEI` | `출력 완료 라벨` | `총 수집 수량` 생산 KPI 카드.
   - X / Y 오프셋 (±mm), 폰트 크기(px), 바코드 높이(mm) 미세조정.
   - `[테스트 라벨 1장 출력]` 버튼.
   - 0건 빈 데이터 시작 & `[양식 덮어쓰기 / 업로드]` 사용자 직접 엑셀 파일 지정.
