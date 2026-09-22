import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const adminSettings = readFileSync('src/app/(admin)/admin/settings.tsx', 'utf8');
const adminUsers = readFileSync('src/app/(admin)/admin/users.tsx', 'utf8');

describe('admin settings access', () => {
  it('keeps sign out reachable from the admin view', () => {
    assert.match(adminSettings, /const\s*\{[^}]*signOut[^}]*\}\s*=\s*useAuth\(\)/s);
    assert.match(adminSettings, /label="Sign out"/);
    assert.match(adminSettings, /onPress=\{\(\)\s*=>\s*void signOut\(\)\}/);
  });

  it('lets an administrator enable their own publisher permission', () => {
    assert.match(adminUsers, /'publisherStatus'/);
    assert.match(adminUsers, /label="Enable publishing for me"/);
    assert.match(adminUsers, /session\?\.user\.id/);
  });
});
