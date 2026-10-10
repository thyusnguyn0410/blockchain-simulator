function getLogTimestamp(log) {
  const value = log?.timestamp ?? log?.time ?? log?.at ?? log?.createdAt;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatLogTime(timestamp) {
  const date = timestamp instanceof Date
    ? timestamp
    : typeof timestamp === 'number'
      ? new Date(timestamp)
      : timestamp
        ? new Date(timestamp)
        : null;

  if (!date || !Number.isFinite(date.getTime())) {
    return new Date().toLocaleTimeString('vi-VN');
  }

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getLogMessage(log) {
  const data = log?.data && typeof log.data === 'object' ? log.data : null;
  const value = log?.message ?? log?.msg ?? log?.text ?? log?.content
    ?? data?.message ?? data?.msg ?? data?.text ?? data?.content;

  if (typeof value === 'string') return value;
  if (value !== null && value !== undefined) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  try {
    return JSON.stringify(log) || String(log);
  } catch {
    return String(log);
  }
}

function classifyLog(log, message = getLogMessage(log)) {
  const declaredType = [
    log?.type,
    log?.event,
    log?.data?.type,
    log?.data?.event,
  ].filter((value) => typeof value === 'string').join(' ').toLowerCase();
  const text = `${declaredType} ${message}`.toLowerCase();

  if (/reject|invalid|error|fail|từ chối|không hợp lệ|thất bại|lỗi/.test(text)) return 'reject';
  if (/sync|consensus|đồng thuận|đồng bộ|peer/.test(text)) return 'sync';
  if (/transaction|\btx\b|mempool|giao dịch/.test(text)) return 'tx';
  if (/block|min(e|ing)|khối/.test(text)) return 'block';
  return 'other';
}

function getNodeSource(log, nodeAddress) {
  const nodeId = log?.nodeId ?? log?.data?.nodeId;
  const explicitPort = log?.httpPort ?? log?.port ?? log?.data?.httpPort ?? log?.data?.port;
  let parsedAddress;

  try {
    parsedAddress = new URL(/^https?:\/\//i.test(nodeAddress) ? nodeAddress : `http://${nodeAddress}`);
  } catch {
    parsedAddress = null;
  }

  const host = parsedAddress?.hostname || nodeAddress || '';
  const port = explicitPort ?? parsedAddress?.port ?? '';
  if (nodeId && port) return `${nodeId}:${port}`;
  if (nodeId) return String(nodeId);
  if (host && port) return `${host}:${port}`;
  return host || (port ? String(port) : '');
}

export function normalizeLogEntry(log, nodeAddress, index = 0) {
  const timestamp = getLogTimestamp(log);
  const message = getLogMessage(log);
  const source = getNodeSource(log, nodeAddress);
  const type = classifyLog(log, message);

  return {
    id: `${nodeAddress}-${timestamp ?? 'unknown'}-${log?.id ?? log?.message ?? log?.msg ?? index}`,
    timestamp,
    time: formatLogTime(timestamp),
    source,
    message,
    type,
  };
}
