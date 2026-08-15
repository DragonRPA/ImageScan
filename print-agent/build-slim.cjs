/**
 * build-slim.cjs — esbuild 번들링 후 caxa 패키징
 *
 * 대상 실행파일: dist/UBUS_DragonRPA_Agent.exe
 */
'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const BUNDLE_DIR  = path.join(__dirname, 'dist', '_bundle');
const BUNDLE_FILE = path.join(BUNDLE_DIR, 'zebra-agent.cjs');
const EXE_OUT     = path.join(__dirname, 'dist', 'UBUS_DragonRPA_Agent.exe');
const OLD_EXE     = path.join(__dirname, 'dist', 'zebra-agent.exe');

// 1. 번들 임시 폴더 초기화 및 이전 exe 정리
if (fs.existsSync(BUNDLE_DIR)) fs.rmSync(BUNDLE_DIR, { recursive: true });
fs.mkdirSync(BUNDLE_DIR, { recursive: true });
if (fs.existsSync(OLD_EXE)) {
  try { fs.unlinkSync(OLD_EXE); } catch (e) {}
}

// 2. esbuild — node_modules 전체를 단일 .cjs 파일로 번들
console.log('▶ [1/3] esbuild 번들링 시작...');
execSync(
  `npx esbuild zebra-agent.cjs` +
  ` --bundle` +
  ` --platform=node` +
  ` --target=node18` +
  ` --format=cjs` +
  ` --outfile="${BUNDLE_FILE}"`,
  { stdio: 'inherit', cwd: __dirname }
);

const origKB   = Math.round(fs.statSync(path.join(__dirname, 'zebra-agent.cjs')).size / 1024);
const bundleKB = Math.round(fs.statSync(BUNDLE_FILE).size / 1024);
console.log(`   원본: ${origKB} KB  →  번들: ${bundleKB} KB`);

// 3. caxa — 번들 폴더만 패키징 (node_modules 제외!)
console.log('\n▶ [2/3] caxa 패키징 시작...');
execSync(
  `npx caxa --input "${BUNDLE_DIR}" --output "${EXE_OUT}"` +
  ` -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/zebra-agent.cjs"`,
  { stdio: 'inherit', cwd: __dirname }
);

// 4. 결과 확인
const exeMB = (fs.statSync(EXE_OUT).size / 1024 / 1024).toFixed(1);
console.log(`\n▶ [3/3] 완료!`);
console.log(`   출력: dist/UBUS_DragonRPA_Agent.exe  (${exeMB} MB)`);

// 5. 임시 번들 폴더 정리
fs.rmSync(BUNDLE_DIR, { recursive: true });
console.log('   임시 번들 폴더 삭제 완료');
