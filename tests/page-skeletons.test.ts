import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const pages = [
  ['consumer home', 'src/app/(consumer)/home.tsx', 'ConsumerHomeSkeleton'],
  ['consumer trades', 'src/app/(consumer)/trades.tsx', 'ConsumerTradesSkeleton'],
  ['consumer account', 'src/app/(consumer)/account.tsx', 'ConsumerAccountSkeleton'],
  ['admin games', 'src/app/(admin)/admin/games.tsx', 'AdminGamesSkeleton'],
  ['admin trades', 'src/app/(admin)/admin/trades.tsx', 'AdminTradesSkeleton'],
  ['admin users', 'src/app/(admin)/admin/users.tsx', 'AdminUsersSkeleton'],
  ['admin settings', 'src/app/(admin)/admin/settings.tsx', 'AdminSettingsSkeleton'],
] as const;

describe('page-shaped loading skeletons', () => {
  for (const [name, path, skeleton] of pages) {
    it(`${name} renders its matching skeleton`, () => {
      const source = readFileSync(path, 'utf8');
      assert.match(source, /const initialLoading =/);
      assert.match(source, /if \(initialLoading\) return/);
      assert.match(source, new RegExp(`loadingFallback=\\{<${skeleton} \\/>\\}`));
    });
  }
});
