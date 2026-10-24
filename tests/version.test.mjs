import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionLess } from '../src/lib/version.ts';

test('sürüm karşılaştırma (client_config min_version)', () => {
  assert.equal(versionLess('0.1.0', '0.2'), true);
  assert.equal(versionLess('1.2', '1.10'), true);
  assert.equal(versionLess('1.10.0', '1.9'), false);
  assert.equal(versionLess('1.2.0', '1.2'), false);
  assert.equal(versionLess('2', '1.9.9'), false);
});
