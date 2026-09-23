import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const adminGames = readFileSync('src/app/(admin)/admin/games.tsx', 'utf8');

describe('admin games catalogue', () => {
  it('loads the seven-day game-first catalogue and debounces search', () => {
    assert.match(adminGames, /useEffect/);
    assert.match(adminGames, /catalogueGames/);
    assert.match(adminGames, /void loadGames\(query, dateFilter, competition\)/);
    assert.match(adminGames, /setTimeout\([\s\S]*SEARCH_DEBOUNCE_MS/);
  });

  it('uses the game to market to outcome flow with price confirmation and preview', () => {
    assert.match(adminGames, /catalogueGameMarkets/);
    assert.match(adminGames, /currentPrice/);
    assert.match(adminGames, /Confirm price/);
    assert.match(adminGames, /previewBatch/);
  });

  it('requires device authentication and explicit confirmation before publishing', () => {
    assert.match(adminGames, /LocalAuthentication\.authenticateAsync/);
    assert.match(adminGames, /Publish immutable batch/);
    assert.match(adminGames, /confirmed: true/);
  });
});
