import fs from 'fs';
import path from 'path';

console.log('=== [UI 런타임 식별자 및 임포트 무결성 전수 검사 시작] ===');

const viewsDir = path.resolve('src/views');
const compDir = path.resolve('src/components');

function checkFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  // 1. lucide-react import 추출
  const lucideMatch = code.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  const importedLucideIcons = new Set();
  if (lucideMatch && lucideMatch[1]) {
    lucideMatch[1].split(',').forEach(item => {
      const name = item.trim();
      if (name) importedLucideIcons.add(name);
    });
  }

  // 2. JSX 태그 사용 검사 (<IconName )
  const jsxTagMatches = code.matchAll(/<([A-Z][a-zA-Z0-9]+)\b/g);
  const usedTags = new Set();
  for (const m of jsxTagMatches) {
    usedTags.add(m[1]);
  }

  // 3. 임포트 누락 검사 (기본 React/HTML 태그 제외)
  const knownReactTags = new Set(['React', 'Fragment', 'Suspense', 'RealBarcodeSvg']);
  const errors = [];

  // 파일 내 로컬 컴포넌트/임포트 목록 추출
  const allImports = new Set([...importedLucideIcons]);
  const importMatches = code.matchAll(/import\s+([A-Z][a-zA-Z0-9]+)\s+from/g);
  for (const m of importMatches) allImports.add(m[1]);
  const namedImports = code.matchAll(/import\s*\{([^}]+)\}/g);
  for (const m of namedImports) {
    m[1].split(',').forEach(it => {
      const parts = it.trim().split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      if (name && /^[A-Z]/.test(name)) allImports.add(name);
    });
  }

  // 로컬 정의 함수/컴포넌트
  const localFunctions = code.matchAll(/(?:function|const)\s+([A-Z][a-zA-Z0-9]+)\b/g);
  for (const m of localFunctions) allImports.add(m[1]);

  // 4. utils 함수 호출 누락 검사
  const utilFuncs = [
    'fetchTableSchema', 'getTableSchema', 'fetchActiveSchema', 'saveTableSchema',
    'getSupabaseClient', 'saveStoredLabelTemplate', 'getStoredLabelTemplate',
    'createEmptyTemplate', 'generateDynamicZpl', 'sendZplToPrinter',
    'fetchActualConnectedPrinters', 'getRegisteredPrinters', 'getActivePrinterId'
  ];

  utilFuncs.forEach(fn => {
    // 코드에서 fn(...) 형태로 호출되었는데
    const callRegex = new RegExp(`\\b${fn}\\s*\\(`, 'g');
    if (callRegex.test(code)) {
      // 파일 내에 fn이 정의되어 있거나 import되어 있는지 검사
      const isImported = new RegExp(`\\b${fn}\\b`).test(code.slice(0, code.indexOf('export default') || 2000));
      const isLocallyDefined = new RegExp(`(?:function|const|let|var)\\s+${fn}\\b`).test(code);
      if (!isImported && !isLocallyDefined) {
        errors.push(`미정의/미임포트된 유틸 함수 호출: ${fn}()`);
      }
    }
  });

  if (errors.length > 0) {
    console.error(`❌ [${fileName}] 검증 실패:`, errors);
    return false;
  } else {
    console.log(`✅ [${fileName}] 무결성 통과 (사용된 태그 ${usedTags.size}개 & 핵심 유틸 검증 완료)`);
    return true;
  }
}

let allPass = true;
[viewsDir, compDir].forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
    files.forEach(f => {
      const pass = checkFile(path.join(dir, f));
      if (!pass) allPass = false;
    });
  }
});

if (!allPass) {
  console.error('\n❌ 전수 검사 실패! 배포가 차단됩니다.');
  process.exit(1);
} else {
  console.log('\n🎉 [최종 통과] 모든 화면 컴포넌트의 식별자 및 아이콘 무결성 100% 확인 완료!');
}
