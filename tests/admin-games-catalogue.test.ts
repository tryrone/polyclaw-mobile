import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const adminGames = readFileSync('src/app/(admin)/admin/games.tsx', 'utf8');

describe('admin games catalogue', () => {
  it('renders the admin shell before progressively loading catalogue data', () => {
    assert.match(adminGames, /catalogueHydrated/);
    assert.match(adminGames, /requestAnimationFrame\(\(\) => setCatalogueHydrated\(true\)\)/);
    assert.match(adminGames, /useAdminResource<AdminSignalBatch\[]>\([\s\S]*games !== null \|\| catalogueError !== null/);
    assert.match(adminGames, /!catalogueHydrated \|\| \(!games && catalogueLoading\)/);
    assert.match(adminGames, /AdminGamesListSkeleton/);
    assert.doesNotMatch(adminGames, /catalogueLoading \|\| drafts\.loading/);
  });

  it('paginates the seven-day game-first catalogue and debounces search', () => {
    assert.match(adminGames, /useEffect/);
    assert.match(adminGames, /catalogueGames/);
    assert.match(adminGames, /void loadGames\(query, dateFilter, competition\)/);
    assert.match(adminGames, /setTimeout\([\s\S]*SEARCH_DEBOUNCE_MS/);
    assert.match(adminGames, /pageSize: GAMES_PAGE_SIZE/);
    assert.match(adminGames, /nextCursor/);
    assert.match(adminGames, /onScrollPosition=\{selected \? undefined : handleCatalogueScroll\}/);
    assert.match(adminGames, /catalogueEndY\.current/);
    assert.match(adminGames, /new Map\([\s\S]*game\.id/);
  });

  it('uses the game to market to outcome flow with price confirmation and preview', () => {
    assert.match(adminGames, /catalogueGameMarkets/);
    assert.match(adminGames, /currentPrice/);
    assert.match(adminGames, /Confirm price/);
    assert.match(adminGames, /previewBatch/);
    assert.match(adminGames, /polymarketUrl: outcome\.polymarketUrl/);
  });

  it('requires device authentication and explicit confirmation before publishing', () => {
    assert.match(adminGames, /LocalAuthentication\.authenticateAsync/);
    assert.match(adminGames, /Publish immutable batch/);
    assert.match(adminGames, /confirmed: true/);
  });
});
