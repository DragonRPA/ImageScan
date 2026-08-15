/**
 * UBUS_DragonRPA_Agent 실시간 상태 감지 및 스마트 자가 업데이트 매니저
 */

export const REQUIRED_AGENT_VERSION = 'v1.4';
export const DEFAULT_AGENT_PORT = 9988;
export const DEFAULT_UPDATE_URL = 'https://raw.githubusercontent.com/DragonRPA/ImageScan/main/print-agent/dist/UBUS_DragonRPA_Agent.exe';

/**
 * 에이전트 실시간 실행 여부 및 버전 체크
 */
export async function checkAgentLiveStatus(port = DEFAULT_AGENT_PORT) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://127.0.0.1:${port}/api/status`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const currentVersion = data.version || 'v1.0';
      const isOutdated = compareVersions(currentVersion, REQUIRED_AGENT_VERSION) < 0;

      return {
        online: true,
        version: currentVersion,
        requiredVersion: REQUIRED_AGENT_VERSION,
        isOutdated,
        agentId: data.agentId,
        printer: data.printer,
        todayCount: data.todayCount
      };
    }
  } catch (err) {
    // 오프라인 또는 연결 불가
  }

  return {
    online: false,
    version: null,
    requiredVersion: REQUIRED_AGENT_VERSION,
    isOutdated: false
  };
}

/**
 * 에이전트 원클릭 스마트 자가 업데이트 트리거
 */
export async function triggerAgentSelfUpdate(port = DEFAULT_AGENT_PORT, updateUrl = DEFAULT_UPDATE_URL) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/self-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updateUrl })
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || '에이전트 업데이트가 시작되었습니다.' };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.error || `업데이트 요청 실패 (HTTP ${res.status})` };
    }
  } catch (err) {
    return { success: false, message: `에이전트 통신 실패: ${err.message}` };
  }
}

/**
 * 간단한 버전 비교 (v1.3 vs v1.4)
 */
function compareVersions(v1, v2) {
  const clean1 = (v1 || '').replace(/[^0-9.]/g, '').split('.').map(Number);
  const clean2 = (v2 || '').replace(/[^0-9.]/g, '').split('.').map(Number);
  const maxLen = Math.max(clean1.length, clean2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = clean1[i] || 0;
    const num2 = clean2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
