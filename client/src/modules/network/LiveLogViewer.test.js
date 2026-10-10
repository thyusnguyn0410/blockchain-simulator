import assert from 'node:assert/strict';
import { test } from 'vitest';
import { formatLogTime, normalizeLogEntry } from './logUtils.js';

test('log timestamps use a safe local-time fallback when invalid', () => {
  const formatted = formatLogTime('not-a-date');

  assert.notEqual(formatted, 'Invalid Date');
  assert.match(formatted, /\d{1,2}:\d{2}:\d{2}/);
});

test('backend log shape is normalized with source, type, time, and message', () => {
  const entry = normalizeLogEntry({
    time: '2026-10-10T10:20:30.000Z',
    message: 'Đào xong Block #2',
    nodeId: 'Node-1',
    httpPort: 3001,
  }, 'localhost:3001');

  assert.equal(entry.source, 'Node-1:3001');
  assert.equal(entry.type, 'block');
  assert.equal(entry.message, 'Đào xong Block #2');
  assert.match(entry.time, /\d{1,2}:\d{2}:\d{2}/);
});

test('normalization supports alternate message fields and declared event types', () => {
  const entry = normalizeLogEntry({
    timestamp: Date.now(),
    type: 'REJECT',
    content: { reason: 'invalid transaction' },
  }, 'localhost:3002');

  assert.equal(entry.source, 'localhost:3002');
  assert.equal(entry.type, 'reject');
  assert.equal(entry.message, '{"reason":"invalid transaction"}');
});
