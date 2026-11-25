import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { splitDateRange } from '../src/shared/api/nbp.api';

const MAX_NBP_RANGE_DAYS = 367;
const DAY_MS = 24 * 60 * 60 * 1000;

const daysInclusive = (startDate: string, endDate: string): number =>
  (Date.parse(endDate) - Date.parse(startDate)) / DAY_MS + 1;

describe('splitDateRange', () => {
  it('keeps a short range in one chunk', () => {
    assert.deepEqual(splitDateRange('2025-01-01', '2025-06-30'), [
      { startDate: '2025-01-01', endDate: '2025-06-30' },
    ]);
  });

  it('splits a full year plus buffer so every chunk fits the NBP limit', () => {
    const chunks = splitDateRange('2024-12-22', '2025-12-31');

    assert.ok(chunks.length > 1);
    assert.ok(chunks.every(c => daysInclusive(c.startDate, c.endDate) <= MAX_NBP_RANGE_DAYS));
  });

  it('covers the range without gaps or overlaps', () => {
    const chunks = splitDateRange('2023-01-01', '2025-12-31');

    assert.equal(chunks[0].startDate, '2023-01-01');
    assert.equal(chunks[chunks.length - 1].endDate, '2025-12-31');
    for (let i = 1; i < chunks.length; i++) {
      assert.equal(daysInclusive(chunks[i - 1].endDate, chunks[i].startDate), 2);
    }
  });
});
