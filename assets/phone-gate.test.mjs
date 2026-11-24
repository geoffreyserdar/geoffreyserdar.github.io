import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isValidUSPhone } = require('./phone-gate.js');

test('real numbers pass', () => {
  assert.equal(isValidUSPhone('952-258-3100'), true);
  assert.equal(isValidUSPhone('612-555-0234'), true);
  assert.equal(isValidUSPhone('763-201-4455'), true);
  assert.equal(isValidUSPhone('+1 (651) 288-1234'), true);
  assert.equal(isValidUSPhone('952.474.9900'), true);
  assert.equal(isValidUSPhone('1-952-258-3100'), true);
  assert.equal(isValidUSPhone('612-555-0200'), true);
});

test('wrong length fails', () => {
  assert.equal(isValidUSPhone('952-258-310'), false);
  assert.equal(isValidUSPhone('95225831001'), false);
  assert.equal(isValidUSPhone(''), false);
  assert.equal(isValidUSPhone('555-1212'), false);
});

test('NANP area and exchange cannot start with 0 or 1', () => {
  assert.equal(isValidUSPhone('052-258-3100'), false);
  assert.equal(isValidUSPhone('152-258-3100'), false);
  assert.equal(isValidUSPhone('952-058-3100'), false);
  assert.equal(isValidUSPhone('952-158-3100'), false);
});

test('N11 area codes and exchanges fail', () => {
  for (const n of ['211', '311', '411', '511', '611', '711', '811', '911']) {
    assert.equal(isValidUSPhone(n + '-234-5678'), false, n + ' area');
    assert.equal(isValidUSPhone('952-' + n + '-3456'), false, n + ' exchange');
  }
});

test('only fictional 555-01xx lines fail', () => {
  assert.equal(isValidUSPhone('612-555-0100'), false);
  assert.equal(isValidUSPhone('612-555-0199'), false);
  assert.equal(isValidUSPhone('612-555-0234'), true);
  assert.equal(isValidUSPhone('(612) 555-1212'), true);
});

test('clear runs fail and short sequences pass', () => {
  assert.equal(isValidUSPhone('123-456-7890'), false);
  assert.equal(isValidUSPhone('234-567-8901'), false);
  assert.equal(isValidUSPhone('234-567-8911'), false);
  assert.equal(isValidUSPhone('987-654-3210'), false);
  assert.equal(isValidUSPhone('345-678-9012'), false);
  assert.equal(isValidUSPhone('876-543-2109'), false);
  assert.equal(isValidUSPhone('952-234-5678'), true);
  assert.equal(isValidUSPhone('612-345-6789'), true);
});

test('repeated digits fail', () => {
  assert.equal(isValidUSPhone('000-000-0000'), false);
  assert.equal(isValidUSPhone('111-111-1111'), false);
  assert.equal(isValidUSPhone('222-222-2222'), false);
  assert.equal(isValidUSPhone('999-999-9999'), false);
  assert.equal(isValidUSPhone('222-222-2223'), true);
});
