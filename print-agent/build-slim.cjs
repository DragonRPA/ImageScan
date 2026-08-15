/**
 * build-slim.cjs  — esbuild 번들링 후 caxa 패키징
 *
 * 결과:
 *   1. dist/zebra-agent-bundled.cjs  (esbuild로 단일 파일 번들)
 *   2. dist/zebra-agent.exe          (caxa로 Node.js + 번들 파일만 패키징)
 *
 * 용량 목표: 330MB → ~90MB
 */
'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const BUNDLE_DIR  = path.join(__dirname, 'dist', '_bundle');
const BUNDLE_FILE = path.join(BUNDLE_DIR, 'zebra-agent.cjs');
const EXE_OUT     = path.join(__dirname, 'dist', 'zebra-agent.exe');

// 1. 번들 임시 폴더 초기화
if (fs.existsSync(BUNDLE_DIR)) fs.rmSync(BUNDLE_DIR, { recursive: true });
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

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

// 3. agent.env 샘플이 있으면 번들 폴더에 복사 (런타임에 cwd에서 읽음)
//    (실제 agent.env 는 exe 와 같은 폴더에 놓으면 됨 — 복사 불필요)

// 4. caxa — 번들 폴더만 패키징 (node_modules 제외!)
console.log('\n▶ [2/3] caxa 패키징 시작...');
execSync(
  `npx caxa --input "${BUNDLE_DIR}" --output "${EXE_OUT}"` +
  ` -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/zebra-agent.cjs"`,
  { stdio: 'inherit', cwd: __dirname }
);

// 5. 결과 확인
const exeMB = (fs.statSync(EXE_OUT).size / 1024 / 1024).toFixed(1);
console.log(`\n▶ [3/3] 완료!`);
console.log(`   출력: dist/zebra-agent.exe  (${exeMB} MB)`);

// 6. 임시 번들 폴더 정리
fs.rmSync(BUNDLE_DIR, { recursive: true });
console.log('   임시 번들 폴더 삭제 완료');
