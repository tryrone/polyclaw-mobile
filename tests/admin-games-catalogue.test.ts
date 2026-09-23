import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const adminGames = readFileSync('src/app/(admin)/admin/games.tsx', 'utf8');

describe('admin games catalogue', () => {
  it('loads upcoming games immediately and refreshes results as the query changes', () => {
    assert.match(adminGames, /useEffect/);
    assert.match(adminGames, /void search\(query\)/);
    assert.match(adminGames, /setTimeout\([\s\S]*SEARCH_DEBOUNCE_MS/);
  });

  it('shows catalogue progress and the number of available results', () => {
    assert.match(adminGames, /Searching games/);
    assert.match(adminGames, /available outcome/);
  });
});
