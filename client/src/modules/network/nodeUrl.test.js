import assert from 'node:assert/strict';
import { test } from 'vitest';
import { normalizeNodeBaseUrl } from './nodeUrl.js';

test('preserves https when normalizing a full backend URL', () => {
  assert.equal(
    normalizeNodeBaseUrl('https://blockchain-sim-hub.onrender.com'),
    'https://blockchain-sim-hub.onrender.com',
  );
});

test('removes a status endpoint suffix before polling', () => {
  assert.equal(
    normalizeNodeBaseUrl('https://blockchain-sim-hub.onrender.com/status'),
    'https://blockchain-sim-hub.onrender.com',
  );
});

test('adds http for local host and preserves its port', () => {
  assert.equal(normalizeNodeBaseUrl('localhost:3001'), 'http://localhost:3001');
});
