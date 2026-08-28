import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pilotAccessPrimaryAction } from '../src/features/pilot-access-policy';

describe('Pilot Access administration policy', () => {
  it('offers renewal for an active grant and a first grant for inactive access', () => {
    assert.deepEqual(pilotAccessPrimaryAction(true), {
      action: 'renew',
      label: 'Renew 30-day pilot access',
      successMessage: 'Pilot access renewed for 30 days.',
    });
    assert.deepEqual(pilotAccessPrimaryAction(false), {
      action: 'grant',
      label: 'Grant 30-day pilot access',
      successMessage: 'Pilot access is active for 30 days.',
    });
  });
});
