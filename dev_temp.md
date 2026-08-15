# 개발 요구사항 및 대기 기록 (dev_temp.md)

- **마지막 업데이트**: 2026-08-15 12:38:00 (KST)
- **현재 버전**: v1.2.0.Build.1
- **GitHub 저장소**: https://github.com/DragonRPA/ImageScan
- **배포 주소**: https://DragonRPA.github.io/ImageScan/

---

## 📌 다음 개편 지시 시 반영할 요구사항

### 1. [UI/레이아웃] 라벨 서식 디자이너 좌측 패널 입력창 가로 넘침(Overflow) 수정
- **대상 파일**: `src/views/LabelDesignerTab.jsx`
- **현상**:
  - `용지 규격`의 `높이 (mm)` 입력창
  - 선택 객체 `속성 패널`의 `Y (mm)` 입력창
  - 2열 그리드(`grid-template-columns: 1fr 1fr`) 내에서 `input` 요소가 카드 우측 테두리를 벗어나 튀어나오는 현상 발생
- **해결 방안**:
  - input 및 부모 컨테이너에 `width: 100%`, `box-sizing: border-box`, `min-width: 0` 적용하여 카드 테두리 내부로 완벽히 격납되도록 CSS 조정
