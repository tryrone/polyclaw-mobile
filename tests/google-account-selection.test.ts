import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const googleAuth = readFileSync('src/auth/google.ts', 'utf8');
const authProvider = readFileSync('src/auth/provider.tsx', 'utf8');

describe('Google account selection after logout', () => {
  it('always starts Google login with the interactive all-account picker', () => {
    assert.match(googleAuth, /GoogleOneTapSignIn\.createAccount\(\)/);
    assert.doesNotMatch(googleAuth, /GoogleOneTapSignIn\.signIn\(\)/);
  });

  it('clears the native Google session during explicit app logout', () => {
    assert.match(authProvider, /signOutFromGoogle/);
    assert.match(authProvider, /const signOut = useCallback\(async \(\) => \{[\s\S]*await signOutFromGoogle\(\)[\s\S]*await save\(null\)/);
  });
});
