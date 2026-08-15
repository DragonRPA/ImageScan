/**
 * build-agent.cjs
 * 실행: node build-agent.cjs
 * 역할: zebra-agent.cjs 파일을 생성합니다.
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'zebra-agent.cjs');

const code = `/**
 * ============================================================
 *  Zebra GK-420D PC Local Print Agent  v1.2
 * ============================================================
 *  실행: node zebra-agent.cjs          (Node.js 설치된 PC)
 *         zebra-agent.exe              (빌드된 독립 실행파일)
 *
 *  외부 설정 파일 (exe와 같은 폴더에 위치, 메모장 수정 가능):
 *    agent.env          -- Supabase URL/KEY, 프린터 IP 오버라이드
 *    agent-config.json  -- 프린터 선택 저장값 (자동 생성)
 *
 *  재설정: zebra-agent.exe --setup
 * ============================================================
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const net       = require('net');
const os        = require('os');
const fs        = require('fs');
const path      = require('path');
const readline  = require('readline');
const { exec }  = require('child_process');

// ── 실행 기반 디렉토리 ────────────────────────────────────────────────────
// 전략: process.cwd() 사용 (exe/node 스크립트 실행 시 현재 디렉터리)
// → 사용자가 exe와 같은 폴더에서 실행하면 agent.env, agent-config.json을 찾음
// → 배치 파일(start-agent.bat)로 실행 시 cd /d 명령으로 폴더 고정
const BASE_DIR = process.cwd();

const CONFIG_PATH = path.join(BASE_DIR, 'agent-config.json');
const ENV_PATH    = path.join(BASE_DIR, 'agent.env');

// ── agent.env 파싱 (메모장으로 수정 가능한 외부 설정) ────────────────────
function loadEnvFile() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  try {
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\\r?\\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key) env[key] = val;
    }
  } catch (e) { /* 무시 */ }
  return env;
}

// ── 최종 설정값 결정 (우선순위: process.env > agent.env > 하드코딩 기본값) ─
const EXT = loadEnvFile();

const SUPABASE_URL  = process.env.SUPABASE_URL  || EXT.SUPABASE_URL  || 'https://tfgbpgutxxlhqbzewkyt.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_KEY  || EXT.SUPABASE_KEY  || 'sb_publishable_wruJQfp3Op-ISvVwb4ZdmA_2OqMUJeQ';
const ENV_PRINTER_HOST = process.env.PRINTER_HOST || EXT.PRINTER_HOST || '';
const ENV_PRINTER_PORT = parseInt(process.env.PRINTER_PORT || EXT.PRINTER_PORT || '9100', 10);
const RECONNECT_MS     = parseInt(process.env.RECONNECT_MS  || EXT.RECONNECT_MS  || '5000', 10);
const POLL_INTERVAL_MS = 10000;
const DEFAULT_PORT  = 9100;
const AGENT_ID      = os.hostname() + '_agent';

// ── 로그 헬퍼 ─────────────────────────────────────────────────────────────
function log(level, msg, extra) {
  const ts  = new Date().toLocaleString('ko-KR', { hour12: false });
  const ico = { INFO:'[OK]', WARN:'[!!]', ERR:'[XX]', PRINT:'[PR]', SETUP:'[CF]' }[level] || '[--]';
  const suf = extra !== undefined ? ' ' + String(extra) : '';
  console.log('[' + ts + '] ' + ico + ' ' + msg + suf);
}

// ── 설정 파일 I/O ─────────────────────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH))
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) { log('WARN', '설정 파일 읽기 실패', e.message); }
  return null;
}
function saveConfig(cfg) {
  cfg.lastConfigured = new Date().toISOString();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  log('SETUP', '설정 저장: ' + CONFIG_PATH);
}

// ── Windows 프린터 목록 (PowerShell Get-Printer) ──────────────────────────
function discoverWindowsPrinters() {
  return new Promise(resolve => {
    const cmd = 'powershell -NoProfile -Command "Get-Printer | Select-Object Name,PortName | ConvertTo-Json -Compress"';
    exec(cmd, { encoding: 'utf8', timeout: 8000 }, (err, stdout) => {
      if (err || !stdout.trim()) { resolve([]); return; }
      try {
        let list = JSON.parse(stdout.trim());
        if (!Array.isArray(list)) list = [list];
        resolve(list);
      } catch { resolve([]); }
    });
  });
}

// 포트명 → TCP 호스트 추출
function extractHostFromPortName(portName) {
  if (!portName) return '127.0.0.1';
  const m1 = portName.match(/^IP_(\\d+\\.\\d+\\.\\d+\\.\\d+)/i);
  if (m1) return m1[1];
  const m2 = portName.match(/^(\\d+\\.\\d+\\.\\d+\\.\\d+)/);
  if (m2) return m2[1];
  return '127.0.0.1';
}

// ── readline 헬퍼 ─────────────────────────────────────────────────────────
function createRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}
function ask(rl, q) {
  return new Promise(resolve => rl.question(q, a => resolve(a.trim())));
}
function askTimeout(rl, q, def, ms) {
  return new Promise(resolve => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) { done = true; console.log('\\n  (' + (ms/1000) + '초 경과 → 자동 시작)'); resolve(def); }
    }, ms);
    rl.question(q, a => {
      if (!done) { done = true; clearTimeout(t); resolve(a.trim() || def); }
    });
  });
}

// ── 대화형 프린터 설정 ────────────────────────────────────────────────────
async function interactiveSetup() {
  const rl = createRl();
  console.log('');
  console.log('  +-------------------------------------------+');
  console.log('  |    [CF]  프린터 설정 (Interactive)        |');
  console.log('  +-------------------------------------------+');
  console.log('');

  // agent.env에 프린터 IP가 이미 지정된 경우 안내
  if (ENV_PRINTER_HOST) {
    console.log('  ** agent.env 에 PRINTER_HOST=' + ENV_PRINTER_HOST + ' 가 지정되어 있습니다.');
    console.log('  ** 이 설정이 agent-config.json 보다 우선 적용됩니다.');
    console.log('');
  }

  log('SETUP', 'Windows 프린터 목록 조회 중...');
  const printers = await discoverWindowsPrinters();

  let printerName = '', printerHost = '127.0.0.1', printerPort = DEFAULT_PORT;
  let connectionType = 'TCP';   // 'TCP' | 'USB_RAW'
  let usbPort = 'USB001';       // USB_RAW 모드에서 사용하는 Windows 포트명

  if (printers.length > 0) {
    console.log('');
    console.log('  === 연결된 프린터 목록 ===');
    printers.forEach((p, i) => {
      const h = extractHostFromPortName(p.PortName);
      const isUsb = h === '127.0.0.1';
      const portLabel = isUsb ? 'USB (' + p.PortName + ')' : 'LAN ' + h;
      console.log('  [' + (i+1) + '] ' + p.Name);
      console.log('       포트: ' + p.PortName + '  →  ' + portLabel);
    });
    console.log('  [' + (printers.length+1) + '] IP 주소 직접 입력 (LAN/네트워크 프린터)');
    console.log('  =========================');
    console.log('');

    const choice = await ask(rl, '  프린터 번호 선택 [1-' + (printers.length+1) + ']: ');
    const num = parseInt(choice, 10);

    if (num >= 1 && num <= printers.length) {
      const sel = printers[num-1];
      printerName = sel.Name;
      const detectedHost = extractHostFromPortName(sel.PortName);
      const isUsbPort = detectedHost === '127.0.0.1';

      if (isUsbPort) {
        // USB 연결: 출력 방식 선택
        console.log('');
        console.log('  [USB 연결 감지] 출력 방식을 선택하세요:');
        console.log('  [1] USB 직접 출력  (copy /b → ' + sel.PortName + ') ← Zebra USB 권장');
        console.log('  [2] TCP 출력       (127.0.0.1:9100, Zebra Setup Utilities 필요)');
        console.log('');
        const modeChoice = await ask(rl, '  방식 선택 [1]: ') || '1';
        if (modeChoice !== '2') {
          connectionType = 'USB_RAW';
          usbPort = sel.PortName;  // e.g., 'USB001'
          log('SETUP', '선택: ' + printerName + ' (USB_RAW → ' + usbPort + ')');
        } else {
          connectionType = 'TCP';
          printerHost    = '127.0.0.1';
          printerPort    = DEFAULT_PORT;
          log('SETUP', '선택: ' + printerName + ' (TCP → 127.0.0.1:' + printerPort + ')');
        }
      } else {
        connectionType = 'TCP';
        printerHost    = detectedHost;
        log('SETUP', '선택: ' + printerName + ' (TCP → ' + printerHost + ':' + printerPort + ')');
      }
    } else {
      printerName = (await ask(rl, '  프린터 이름 (설명용): ')) || 'Zebra GK-420D';
      printerHost = (await ask(rl, '  IP 주소 [예: 192.168.1.50]: ')) || '127.0.0.1';
      connectionType = 'TCP';
    }
  } else {
    console.log('  ** 설치된 프린터 없음. 직접 입력하세요. **');
    console.log('  [1] USB 직접 출력  (copy /b → USB001)');
    console.log('  [2] TCP 출력       (IP:9100)');
    const modeChoice = await ask(rl, '  방식 선택 [1]: ') || '1';
    if (modeChoice !== '2') {
      printerName = (await ask(rl, '  프린터 이름: ')) || 'Zebra GK-420D';
      usbPort     = (await ask(rl, '  USB 포트 [USB001]: ')) || 'USB001';
      connectionType = 'USB_RAW';
    } else {
      printerName = (await ask(rl, '  프린터 이름: ')) || 'Zebra GK-420D';
      printerHost = (await ask(rl, '  IP 주소 [127.0.0.1]: ')) || '127.0.0.1';
      const portInput = await ask(rl, '  TCP 포트 [9100]: ');
      printerPort = parseInt(portInput, 10) || DEFAULT_PORT;
      connectionType = 'TCP';
    }
  }

  // TCP 모드일 때만 포트 추가 질문
  if (connectionType === 'TCP') {
    const portInput = await ask(rl, '  TCP 포트 [기본 ' + DEFAULT_PORT + ']: ');
    printerPort = parseInt(portInput, 10) || DEFAULT_PORT;
  }

  console.log('');
  console.log('  === 최종 설정 확인 ===');
  console.log('  프린터  : ' + printerName);
  console.log('  연결    : ' + connectionType);
  if (connectionType === 'USB_RAW') {
    console.log('  USB 포트: ' + usbPort + '  (copy /b 직접 출력)');
  } else {
    console.log('  주소    : ' + printerHost + ':' + printerPort);
  }
  console.log('  라벨    : 72mm x 40mm / Code39 / 203DPI');
  console.log('  ======================');
  console.log('');

  const ok = await ask(rl, '  저장하시겠습니까? (Y/n): ');
  rl.close();
  if (ok.toLowerCase() === 'n') { log('SETUP', '설정 취소. 다시 실행하세요.'); process.exit(0); }

  const cfg = { printerName, connectionType, printerHost, printerPort, usbPort, labelWidthMm: 72, labelHeightMm: 40 };
  saveConfig(cfg);
  return cfg;
}

// 저장된 설정 확인 (5초 자동 시작, R 누르면 재설정)
async function showConfigAndConfirm(config) {
  // agent.env에 오버라이드 값이 있으면 표시
  const effectiveHost = ENV_PRINTER_HOST || config.printerHost;
  const effectivePort = ENV_PRINTER_PORT || config.printerPort;
  const isOverridden  = !!ENV_PRINTER_HOST;

  const d = config.lastConfigured
    ? new Date(config.lastConfigured).toLocaleString('ko-KR', { hour12: false }) : '-';

  console.log('');
  console.log('  === 저장된 프린터 설정 ===');
  console.log('  프린터  : ' + config.printerName);
  console.log('  연결    : ' + config.connectionType);
  if (isOverridden) {
    console.log('  주소    : ' + effectiveHost + ':' + effectivePort + '  [agent.env 오버라이드]');
    console.log('  (저장값 : ' + config.printerHost + ':' + config.printerPort + ')');
  } else {
    console.log('  주소    : ' + effectiveHost + ':' + effectivePort);
  }
  console.log('  라벨    : ' + config.labelWidthMm + 'mm x ' + config.labelHeightMm + 'mm / Code39');
  console.log('  설정일시: ' + d);
  console.log('  =========================');
  console.log('');

  const rl  = createRl();
  const ans = await askTimeout(rl, '  [Enter] 즉시 시작  /  [R+Enter] 프린터 재설정: ', '', 5000);
  rl.close();
  if (ans.toLowerCase() === 'r') return interactiveSetup();

  // agent.env 오버라이드 반영
  return Object.assign({}, config, {
    printerHost: effectiveHost,
    printerPort: effectivePort
  });
}

// ── ZPL 조립 (72mm x 40mm, 203DPI, Code39) ───────────────────────────────
function buildZpl(item) {
  const a  = (item.asset_no    || 'UNKNOWN').replace(/[^A-Z0-9\\-_\\. ]/gi, '');
  const im = (item.imei        || '-').replace(/[^0-9]/g, '');
  const sn = (item.serial_no   || '-').slice(0, 20);
  const mc = (item.mac_address || '-').replace(/[^A-F0-9\\-:]/gi, '').slice(0, 20);
  const bc = a.toUpperCase().replace(/[^A-Z0-9\\-\\.\\$\\/\\+%\\s]/g, '');
  return [
    '^XA', '^PW576', '^LL320', '^CI28', '^LH0,0', '^MMT',
    '^FO16,10^A0N,28,28^FD' + a  + '^FS',
    '^FO10,46^GB556,2,2^FS',
    '^FO16,54^A0N,20,20^FDIMEI: ' + im + '^FS',
    '^FO16,82^A0N,18,18^FDS/N : ' + sn + '^FS',
    '^FO16,108^A0N,18,18^FDMAC : ' + mc + '^FS',
    '^FO16,138^B3N,N,80,Y,N^FD' + bc + '^FS',
    '^XZ'
  ].join('\\n');
}

// ── [모드 1] TCP 전송 (LAN / Zebra Setup Utilities TCP 리스너) ──────────────
function sendZplViaTcp(zpl, host, port) {
  return new Promise((resolve, reject) => {
    const s = net.createConnection({ host, port }, () => s.write(zpl, 'utf8', () => s.end()));
    s.on('close', resolve);
    s.on('error', reject);
    s.setTimeout(8000, () => { s.destroy(); reject(new Error('TCP 타임아웃 (' + host + ':' + port + ')')); });
  });
}

// ── [모드 2] USB 직접 출력 (copy /b zplfile USB001) ──────────────────────────
// Windows USB 연결 Zebra 프린터에서 TCP 없이 바로 출력
function sendZplViaWindowsPort(zpl, portName) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), 'zebra_' + Date.now() + '.zpl');
    try {
      fs.writeFileSync(tmpFile, Buffer.from(zpl, 'ascii'));
      // copy /b 명령으로 Windows 프린터 포트에 직접 전송
      const cmd = 'copy /b "' + tmpFile + '" ' + portName;
      log('PRINT', 'USB 직접 출력: ' + cmd);
      exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tmpFile); } catch {}
        if (err) { reject(new Error('USB 포트 전송 실패 (' + portName + '): ' + (stderr || err.message))); }
        else { resolve(); }
      });
    } catch (e) { reject(e); }
  });
}

// ── 프린터 연결 점검 (connectionType 자동 감지) ───────────────────────────────
function checkPrinterConnection(config) {
  if (config.connectionType === 'USB_RAW') {
    // USB 직접 모드: 포트 존재 여부만 확인 (항상 OK로 처리, 실제 오류는 출력 시 감지)
    log('INFO', '[OK] USB 직접 출력 모드 (' + config.usbPort + ') - 연결 점검 생략');
    return Promise.resolve(true);
  }
  // TCP 모드 점검
  return new Promise(resolve => {
    const { printerHost: host, printerPort: port } = config;
    const s = net.createConnection({ host, port }, () => {
      s.end();
      log('INFO', '[OK] 프린터 TCP 연결 확인 (' + host + ':' + port + ')');
      resolve(true);
    });
    s.on('error', err => {
      log('WARN', '프린터 TCP 연결 불가 (' + host + ':' + port + ') - ' + err.message);
      log('WARN', '프린터 전원 및 연결을 확인하세요. 에이전트는 계속 실행됩니다.');
      resolve(false);
    });
    s.setTimeout(3000, () => {
      s.destroy();
      log('WARN', '프린터 TCP 연결 타임아웃 (3초)');
      resolve(false);
    });
  });
}

// ── print_queue 처리 ──────────────────────────────────────────────────────
async function processQueueItem(row, supabase, config) {
  const { id, asset_no, imei } = row;
  log('PRINT', 'ZPL 출력  자산:' + asset_no + '  IMEI:' + imei);

  const { error: le } = await supabase.from('print_queue')
    .update({ print_status: 'PRINTING', agent_id: AGENT_ID })
    .eq('id', id).eq('print_status', 'PENDING');
  if (le) { log('WARN', '선점 실패 (이미 처리 중?)', le.message); return; }

  try {
    const zpl = buildZpl(row);
    if (config.connectionType === 'USB_RAW') {
      await sendZplViaWindowsPort(zpl, config.usbPort || 'USB001');
    } else {
      await sendZplViaTcp(zpl, config.printerHost, config.printerPort);
    }
    log('PRINT', '[OK] 출력 완료  ' + asset_no);
    await supabase.from('print_queue')
      .update({ print_status: 'PRINTED', printed_at: new Date().toISOString() })
      .eq('id', id);
  } catch (err) {
    log('ERR', 'ZPL 전송 실패', err.message);
    await supabase.from('print_queue')
      .update({ print_status: 'ERROR', print_error: err.message })
      .eq('id', id);
  }
}

async function processPendingOnStartup(supabase, config) {
  log('INFO', '기존 PENDING 큐 재처리 중...');
  const { data, error } = await supabase.from('print_queue').select('*')
    .eq('print_status', 'PENDING').order('created_at', { ascending: true });
  if (error)        { log('WARN', 'PENDING 조회 실패', error.message); return; }
  if (!data?.length) { log('INFO', '재처리할 PENDING 없음'); return; }
  log('INFO', 'PENDING ' + data.length + '건 처리');
  for (const row of data) await processQueueItem(row, supabase, config);
}

// ── Realtime 구독 (필터 없음 - 모든 INSERT 수신 후 코드에서 상태 체크) ────────
// ※ 주의: Supabase Free 플랜에서 filter 옵션이 작동하지 않을 수 있어 제거함
function setupRealtimeSubscription(supabase, config) {
  log('INFO', 'Supabase Realtime 구독 시작... (필터 없음 - 전체 INSERT 감지)');
  const ch = supabase.channel('zebra-print-agent')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_queue' },  // 필터 제거
      async payload => {
        if (!payload.new) return;
        // 코드에서 직접 PENDING 체크 (필터 대신)
        if (payload.new.print_status !== 'PENDING') {
          log('INFO', 'INSERT 감지 (PENDING 아님, 건너뜀): ' + payload.new.print_status);
          return;
        }
        log('INFO', '[RT] 신규 PENDING 감지  자산:' + payload.new.asset_no + '  IMEI:' + payload.new.imei);
        await processQueueItem(payload.new, supabase, config);
      })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        log('INFO', '[OK] Realtime 구독 완료 (zebra-print-agent)');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        log('WARN', 'Realtime ' + status, err?.message);
        setTimeout(() => ch.unsubscribe().then(() => setupRealtimeSubscription(supabase, config)), RECONNECT_MS);
      }
    });
  return ch;
}

// ── 폴링 백업 루프 (10초마다 PENDING 재확인 - Realtime 누락 방어) ────────────
function startPollingLoop(supabase, config) {
  log('INFO', 'PENDING 폴링 루프 시작 (간격: ' + (POLL_INTERVAL_MS/1000) + '초)');
  setInterval(async () => {
    const { data, error } = await supabase
      .from('print_queue')
      .select('*')
      .eq('print_status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) { log('WARN', '폴링 조회 실패', error.message); return; }
    if (!data?.length) return;  // 조용히 패스
    log('INFO', '[POLL] PENDING ' + data.length + '건 발견 → 처리');
    for (const row of data) await processQueueItem(row, supabase, config);
  }, POLL_INTERVAL_MS);
}

// ── 메인 ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('+=================================================+');
  console.log('|  Zebra GK-420D PC Print Agent  v1.2            |');
  console.log('|  Supabase print_queue -> ZPL TCP 자동 출력     |');
  console.log('+=================================================+');
  console.log('  설정 폴더: ' + BASE_DIR);
  if (fs.existsSync(ENV_PATH)) {
    console.log('  외부설정 : agent.env 로드됨');
  } else {
    console.log('  외부설정 : agent.env 없음 (기본값 사용)');
  }
  console.log('');

  const forceSetup = process.argv.includes('--setup');
  let config = loadConfig();

  if (forceSetup || !config) {
    if (forceSetup) log('SETUP', '--setup → 프린터 재설정');
    else            log('SETUP', '저장된 설정 없음 → 초기 설정');
    config = await interactiveSetup();
  } else {
    config = await showConfigAndConfirm(config);
  }

  console.log('');
  log('INFO', '에이전트  : ' + AGENT_ID);
  log('INFO', 'Supabase  : ' + SUPABASE_URL);
  log('INFO', '프린터    : ' + config.printerName + ' (' + config.printerHost + ':' + config.printerPort + ')');
  log('INFO', '라벨 규격 : 72mm x 40mm / Code39');
  console.log('');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  await checkPrinterConnection(config);
  await processPendingOnStartup(supabase, config);
  setupRealtimeSubscription(supabase, config);
  startPollingLoop(supabase, config);  // Realtime 누락 방어용 폴링 백업

  log('INFO', '[PR] 상시 대기 -- 모바일 IMEI 확정 시 자동 라벨 출력');
  console.log('');
  console.log('  재설정: zebra-agent.exe --setup');
  console.log('  종료  : Ctrl + C');
  console.log('');
}

main().catch(err => {
  log('ERR', '초기화 실패', err.message);
  process.exit(1);
});
`;

fs.writeFileSync(OUT, code, 'utf8');
console.log('zebra-agent.cjs v1.2 생성 완료 (' + code.length + ' bytes)');
console.log('경로: ' + OUT);
