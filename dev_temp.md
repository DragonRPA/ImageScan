# 개발 요구사항 및 완료 상황 기록 (dev_temp.md)

- **마지막 업데이트**: 2026-08-14 10:48:15 (KST)
- **완료 목표 버전**: v1.0.0.Build.6
- **GitHub 저장소**: https://github.com/DragonRPA/ImageScan
- **GitHub Pages 배포 주소**: https://DragonRPA.github.io/ImageScan/

## 요구사항 요약 (모바일/PC 디바이스별 전용 뷰 완벽 분리)
1. **디바이스 자동 감지 (Mobile vs PC Dual Architecture)**:
   - 핸드폰 접속 시: 불필요한 테이블을 제거하고 **모바일 전용 카메라 뷰파인더 100% 꽉 찬 UI (`MobileScannerView.jsx`)** 자동 표출.
   - PC 접속 시: 모니터 화면을 100% 활용하는 **PC 전용 대시보드 & 라벨 프린터 제어 UI (`PCDashboardView.jsx`)** 자동 표출.
   - 필요 시 상단 스위치를 통해 언제든 반대 뷰로 수동 전환 가능.

2. **완료된 기존 기능**:
   - 모바일 무버튼(Hands-Free) 300ms 실시간 OCR 스캔 & 소리/진동 피드백.
   - Supabase Realtime 0.1초 동기화 & Auto Scan-to-Print 라벨 자동 출력.
   - [이미지 1] 1:1 맞춤 Code 39 바코드 (`*asset_no*`) 라벨 인쇄.
   - [이미지 2] 100% 일치 엑셀/CSV 다운로드.
   - 엑셀 양식 일괄 업로드 & 기존 DB 전체 덮어쓰기 (`DataImportModal.jsx`).
