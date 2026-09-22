import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const customerAccount = readFileSync('src/app/(consumer)/account.tsx', 'utf8');
const adminSettings = readFileSync('src/app/(admin)/admin/settings.tsx', 'utf8');
const tabBar = readFileSync('src/components/tab-bar.tsx', 'utf8');
const preferenceItems = readFileSync('src/features/account/preference-items.tsx', 'utf8');

describe('theme access', () => {
  it('keeps the appearance picker reachable for customers', () => {
    assert.match(customerAccount, /<ThemePicker\s*\/>/);
    assert.match(customerAccount, /styles\.preferenceInset/);
  });

  it('keeps the appearance picker reachable for admins', () => {
    assert.match(adminSettings, /<ThemePicker\s*\/>/);
  });

  it('uses semantic theme colors for navigation and notification switches', () => {
    assert.match(tabBar, /backgroundColor:\s*theme\.panel/);
    assert.match(tabBar, /backgroundColor:\s*theme\.text/);
    assert.match(preferenceItems, /false:\s*theme\.borderStrong,\s*true:\s*theme\.accent/);
    assert.match(preferenceItems, /thumbColor=\{theme\.switchThumb\}/);
  });
});
