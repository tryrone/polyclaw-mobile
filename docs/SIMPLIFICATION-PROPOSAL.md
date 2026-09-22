# PolyClaw Mobile — Simplification Proposal

**Status:** proposal only. No application code, config, or asset was changed by this document.
**Date:** 2026-09-19
**Applies to:** `polyclaw-mobile` (Expo, expo-router) — **both** the consumer app and the operator console
**Companion:** `docs/DESIGN_SYSTEM.md` (updated with the density rules and reference set in this change)

---

## 0. Implementation status

**Shipped** — verified with `npx tsc --noEmit` and `npm run lint`:

- One shared `PolyClawTabBar` replaces the two divergent tab bars (glass on dark, reduced-motion aware, always-visible icon + label slots).
- Consumer tab model 5 → 4 (Home · Portfolio · Bot · Account). `activity` is a hidden route, and its pathname highlights Portfolio.
- Home rebuilt: hero figure + four metrics, one chart with `View all`, three latest decisions, and the conditional "Ready to start your paper bot?" card (`§5.1`).
- Portfolio rebuilt as five lenses — Performance · Decisions · Positions · Manual · Linked — absorbing the old Activity ledger (`§5.2`).
- Bot rebuilt into a status card, a risk segmented control with the three limit values, a `Trade cap` disclosure, and a `Start bot` disclosure holding country, invite code, both consent checkboxes and the activate action (`§5.3`).
- Account rebuilt into profile + `Account` (Subscription · Wallet · Live access · Signer) and `Preferences` (Notifications · Appearance · Safety & disclosures · Account controls), with "How PolyClaw works" as a standalone row (`§5.4`).
- Operator: Monitor's 8-step funnel collapses to one expanding line and the risk-guardrail card folds into the hero state chip; Queue's no-bet decisions sit behind a count row; More is split into two groups of four (`§6`).

**Not yet done**

- The operator detail-route copy pass (`§6`: Alerts, Audit, Connections, Manual bets, Models, Risk controls, Pilot access, Live account review).
- The consumer bottom action dock (`R7`). PolyClaw's `Screen` primitive has no dock slot, so the single primary action renders as a prominent in-flow control instead.

**Deviations from the spec above**

- `§5.2` — the snapshots table and budgets open as inline disclosures rather than sheets, and the live wallet-balance card lives in the `Linked` lens rather than Account.
- `§5.3` — run/pause stays an explicit labelled button rather than a bare switch, so the state change keeps its confirmation and accessibility label.
- `§5.4` — Wallet and Live access remain two rows (Subscription · Wallet · Live access · Signer) rather than one merged expander, which keeps the group at four rows. The conditional Football trading row is not rendered because `features.manualFootballTrading` is `false`.

---

## 1. Why

`polyclaw-mobile` ships two products in one binary. A `USER` gets a five-tab consumer app
(Overview · Bot · Portfolio · Activity · Account); an `ADMIN` gets a five-tab operator console
(Monitor · Queue · Trades · Results · More) plus nine deeper operator routes. The two tab bars are
separate components with different motion, shapes and layouts.

The consumer app is the priority. **Portfolio alone stacks about ten sections** — equity card with
four metrics, four range filters, three source filters, a scrubbable chart, a twelve-row
"Exact snapshots" table, trading budgets, live positions with a destructive close action, a live
wallet-balance card, manual orders, and linked Polymarket positions. **Account carries nine
destinations** across four groups. **Bot is a settings page, a licence form and an activation form in
one scroll.** Home repeats the equity figure that Portfolio already owns.

The operator console is intentionally evidence-heavy and its design system says so. It is **not**
being restructured: the operator keeps five tabs and all nine detail routes, and this proposal only
reduces on-screen density there. Every criterion, observed value, threshold, provenance hash, audit
fact and confirmation phrase is retained verbatim.

---

## 2. Density rules (the spine of this proposal)

| # | Rule |
|---|------|
| R1 | **One primary number per screen.** Supporting figures are capped at four. |
| R2 | **Max three sections per scroll.** Max four rows per section. |
| R3 | **Lenses replace pages.** Sibling pages become pill switchers on one surface. |
| R4 | **Depth lives behind `View all →`.** |
| R5 | **Action cards are question-shaped**, with one muted sub-line. |
| R6 | **One accent colour.** Semantic colour is reserved for state, never decoration. |
| R7 | **One bottom action dock** for the screen's single primary action. |

Clarifications:

- **Archive exemption.** Ledgers, trade lists and audit lists are exempt from the R2 row cap. They
  keep **at most three chrome elements above the list** and reveal further pages on demand.
- **Operator exemption.** The operator console is exempt from R1/R2 where evidence completeness
  requires it (Queue's no-bet criteria, Models' metric tables, `trade/[id]`'s decision trace). It is
  **not** exempt from R4 and R7 — facts are progressively disclosed, never deleted.

---

## 3. Current state — full screen inventory

### 3.1 Consumer (`role === 'USER'`)

| Screen | Route | What is on it today | Blocks |
|---|---|---|---|
| **Overview** | `src/app/(consumer)/home.tsx` | "Paper portfolio" header with bot-state pill · simulated-equity hero (one big figure + 4 metrics: available, realized P&L, open exposure, drawdown) · "7-day equity" card with chart and (feature-flagged) "Trade a football match" CTA · conditional "Start your pilot paper bot / 7-day paper trial" card · double-chance overview block · "Latest activity" with up to 4 decisions. Two queries plus a 60s portfolio poll. | 6 |
| **Bot** | `src/app/(consumer)/bot.tsx` | Access notice card (pilot/subscription variants, request-access CTA) · run/pause status card · "Risk profile" radio group (3 presets + a per-trade/daily/drawdown limits row) · "Trade cap" with a large amount field, 5 presets, validation and Save · "Release eligibility" (country input, optional invite code, two consent checkboxes, activate button) · "How paper trading works" link. | 6 |
| **Portfolio** | `src/app/(consumer)/portfolio.tsx` | Total-equity card (one big figure + 4 metrics) · 4 range filters (1W/1M/3M/ALL) · source filters (2 today: Combined/Bot; 3 when manual trading is enabled) · scrubbable chart with an inspect line · "Exact snapshots" (12-row table) · "Trading budgets" (bot + manual inputs, Save) · "Trade a football match" CTA · "Live bot positions" with a destructive "Close risk now" per position · live wallet-balance card with funding thresholds · "Manual orders" · "Linked Polymarket positions" (read-only). | ~10 |
| **Activity** | `src/app/(consumer)/activity.tsx` | "Decision ledger" list of positions (fixture, market/odds, model probability, stake, realized P&L, rejection reasons) · "Manual football orders" list with a cancel action. | 2 + lists |
| **Account** | `src/app/(consumer)/account.tsx` | Profile (name, email, copyable user ID) · **Membership & trading**: subscription, Polymarket wallet (link/create/deposit routes), live-trading access approval checklist, signer · **Preferences**: notifications, appearance · **Help & education**: how PolyClaw works → setup guide · **Security & account**: safety and disclosures, account controls · sign out. | 9 items / 4 groups |
| **Wallet (legacy)** | `src/app/(consumer)/wallet.tsx` | Redirect to Portfolio. No change needed. | — |
| **Setup guide** | `src/app/getting-started.tsx` | Stage explanation, setup progress checklist, wallet-role explanation, risk warning. Reached from Account and on first run. | 4 |
| **Manual trade** | `src/app/football-trade.tsx` | Feature-flagged **off** (`features.manualFootballTrading === false`). Catalogue filters, limit ticket, quote, signature, submit. | 5 |
| **Trade detail** | `src/app/trade/[id].tsx` | Decision trace: probability breakdown, decision checklist, mapping evidence, price timeline. | 4 |

### 3.2 Onboarding

| Screen | Route |
|---|---|
| Welcome | `src/app/(onboarding)/welcome.tsx` — brand hero, three benefit chips, CTA |
| Sign in | `src/app/(onboarding)/sign-in.tsx` — form, biometric opt-in prompt |
| Sign up | `src/app/(onboarding)/sign-up.tsx` — form |

### 3.3 Operator (`role === 'ADMIN'`)

| Screen | Route | What is on it today |
|---|---|---|
| **Monitor** | `src/app/(tabs)/index.tsx` | Bankroll hero (one big ticker figure + 4 metrics: exposure, realized P&L, ROI, drawdown, plus a halt/shield icon) · halt banner · "Next decision" trade card · "Session funnel" (8 steps + preparation line) per session · "Risk guardrails" card · Pause-trading action. |
| **Queue** | `src/app/(tabs)/queue.tsx` | "Trade queue" grouped into Double Chance / Other markets · "No-bet decisions" cards, each with up to 5 criteria rows (pass/fail, observed vs required) and a provenance line. |
| **Trades** | `src/app/(tabs)/trades.tsx` | Filters row (ALL TRADES pill + paper/live labelling note) · trade list. |
| **Results** | `src/app/(tabs)/performance.tsx` | 4 metrics + performance chart · paper-to-live gate card. |
| **More** | `src/app/(tabs)/more.tsx` | 8 link rows (Models, Risk controls, Pilot access, Live account review, Connections, Manual bets, Alerts, Audit log) · appearance toggle · signed-in-as + copyable admin ID · sign out. |
| Alerts | `src/app/alerts.tsx` | Severity pill, title, description, date, acknowledge action. |
| Audit log | `src/app/audit.tsx` | Action pill, target, timestamp, actor. |
| Connections | `src/app/connections.tsx` | Polymarket / SportyBet / research pipeline health rows. |
| Models | `src/app/models.tsx` | Consumer health per market, activation mode, and Brier/log-loss metric tables per market. |
| Risk controls | `src/app/risk.tsx` | Execution state, 6 limit metrics, type-to-confirm resume (`RESUME LIVE TRADING` / `RESUME PAPER TRADING`). |
| Pilot access | `src/app/pilot-access.tsx` | Users/Admins tabs, pending requests, user search, membership cards, requirement checklist, appoint/revoke administrator with required reasons, membership history. |
| Live account review | `src/app/live-review.tsx` | Awaiting-approval accounts with full evidence (`evidenceHash`, owner, deposit wallet, deployment tx, approvals, pUSD, signer/wallet/bot lifecycle) · canary release queue with required operator reason. |
| Manual bets | `src/app/manual-bets.tsx` | SportyBet handoff proposals with approve/reject. |
| Trade detail | `src/app/trade/[id].tsx` | Shared with consumer: decision trace. |

### 3.4 Shared infrastructure

| Concern | File |
|---|---|
| Operator tab bar | `src/app/(tabs)/_layout.tsx` — floating glass pill bar, spring scale on active, label only when active |
| Consumer tab bar | `src/app/(consumer)/_layout.tsx` — docked pill bar with a sliding indicator and always-on labels |

**These are two implementations of the same idea and are the single largest duplication in the app.**

---

## 4. Target navigation

### 4.1 Consumer: 5 → 4 tabs

| Before | After |
|---|---|
| Overview · Bot · Portfolio · Activity · Account | **Home · Portfolio · Bot · Account** |

Activity stops being a tab. Its ledger becomes a **lens inside Portfolio**. Home stops duplicating
Portfolio's equity chart and becomes a true overview.

### 4.2 Operator: 5 tabs, unchanged

Monitor · Queue · Trades · Results · More — retained, with the density reductions in §6. All nine
detail routes are retained unchanged.

### 4.3 Route disposition (consumer)

| Route | Before | After |
|---|---|---|
| `(consumer)/home` | Tab 1 "Overview" | Tab 1 **"Home"** — rebuilt (§5.1) |
| `(consumer)/portfolio` | Tab 3 | Tab 2 — becomes a lensed surface (§5.2) |
| `(consumer)/bot` | Tab 2 | Tab 3 — status + risk + one dock (§5.3) |
| `(consumer)/activity` | Tab 4 | **Hidden route** — content absorbed as the Portfolio *Decisions* lens |
| `(consumer)/account` | Tab 5 | Tab 4 — 2 groups × 4 rows (§5.4) |
| `getting-started` | Reached from Home/Bot/Account | Reached from **Account → How PolyClaw works** and the first-run redirect (unchanged) |
| `football-trade` | Hidden unless flagged | Unchanged, and now reached from **Bot → Football trading** instead of Home/Portfolio |
| `trade/[id]` | Pushed from cards | Unchanged |

---

## 5. Consumer per-screen decisions

### 5.1 Home — `src/app/(consumer)/home.tsx`

**Primary number:** simulated equity. **Target:** hero + 3 sections (from 6 blocks).

1. **Hero** — "Simulated equity", the one big figure, one bot-state chip, and **exactly 4 mini
   metrics** (available, realized P&L, open exposure, drawdown). No chart here.
2. **Performance** — one chart (the 7-day series) with a single `View all →` into Portfolio →
   Performance. No separate range control on Home.
3. **Latest decisions** — **3 rows** (fixture, market, stake, status) + `View all →` into Portfolio →
   Decisions.
4. **Conditional question card** — only when `botState === 'SETUP'`: *"Ready to start your paper
   bot?"* with one muted sub-line and one CTA into Bot. This is also the bottom action dock.

**Remove from this screen (with destination):**

| Removed | Destination | Taps |
|---|---|---|
| Double-chance overview block | Portfolio → **Positions** lens (Double Chance group) | 1 + 1 |
| "Trade a football match" CTA (feature-flagged) | Bot → Football trading row | 1 + 1 |
| Duplicate range/source controls | Portfolio → Performance lens | 1 + 1 |
| Setup card (kept, reworded) | Becomes the question-shaped card + dock | 0 |

### 5.2 Portfolio — `src/app/(consumer)/portfolio.tsx`

**Primary number:** total equity. **Target:** lens row + ≤3 sections per lens (from ~10 sections).

Replace the single long scroll with **four lenses (R3)**:

| Lens | Content |
|---|---|
| **Performance** | Equity figure + 4 metrics · range pills (1W/1M/3M/ALL) · one chart with scrub · `View all snapshots →` for the 12-row table · an **Edit** button opening the budgets sheet |
| **Decisions** | The ex-Activity decision ledger (fixture, market/odds, model probability, stake, realized P&L, rejection reason) |
| **Positions** | Live bot positions with `Close risk now` · the double-chance overview group |
| **Manual** | Manual orders with cancel · manual budget (when the feature flag is on) |
| **Linked** | Read-only linked Polymarket positions |

**Change:**

1. Lens pills replace the separate Activity tab and the always-visible 12-row table.
2. The "Exact snapshots" table moves behind `View all snapshots` (sheet or pushed detail).
3. Trading budgets move behind an **Edit** action in a sheet; the unallocated figure stays visible as
   one supporting value.
4. The live wallet-balance card moves to **Account → Wallet & live access**.
5. The "Trade a football match" CTA moves to Bot.

### 5.3 Bot — `src/app/(consumer)/bot.tsx`

**Primary number:** none (status surface). **Target:** 3 rows + 1 dock (from 6 blocks).

| Row | Content |
|---|---|
| **Status** | Bot state + one Switch (run/pause) + access chip. Replaces the notice card *and* the run/pause card. |
| **Risk** | One segmented control (Conservative / Balanced / Aggressive) + the three limit values as small figures. Replaces the radio group + limits row. |
| **Trade cap** | The current value + `Edit →` opening the presets sheet. Replaces the inline amount field and preset row. |

**Bottom dock:** the single primary action — **Start bot** when `botState === 'SETUP'`, otherwise
nothing (run/pause is the switch in the status row, which is a real state control, not a dock action).

**Moves:**

| Moved | Destination | Taps |
|---|---|---|
| Release eligibility (country, invite, 2 consents, activate) | **Start-bot sheet** behind the dock | 1 |
| Access notice + request-pilot-access | A single question-shaped row *"Need access to continue?"* which opens the same sheet | 1 |
| "How paper trading works" | Account → How PolyClaw works | 1 |
| Football trading (flagged) | A row in the status group when enabled | 1 |

**The two consent checkboxes and the activation button are preserved verbatim inside the sheet** —
this is a relocation, not a removal.

### 5.4 Account — `src/app/(consumer)/account.tsx`

**Target:** profile + 2 groups × 4 rows + sign out (from 9 items in 4 groups).

| Group | Rows |
|---|---|
| **Account** | Profile (name, email, user ID) · Subscription · **Wallet & live access** (expands to the wallet link/create/deposit routes, the live-access approval checklist and the signer evidence) · Football trading (conditional) |
| **Preferences** | Notifications · Appearance · Safety & disclosures (absorbs account controls) · How PolyClaw works |

Bottom action: **Sign out**.

The live-trading approval checklist and signer evidence are **not deleted** — they collapse into the
`Wallet & live access` expander, one tap from the Account tab.

---

## 6. Operator density reductions (no restructuring)

Every item below is a presentation change. **No criterion, observed value, threshold, provenance,
hash, lifecycle state, audit fact or confirmation phrase is removed.**

| Screen | Change |
|---|---|
| **Monitor** | The 8-step session funnel collapses to **one expanding summary line** (`1,204 discovered → 3 filled · view funnel`) that expands to the existing 8 steps and preparation line. The risk-guardrail card folds into the hero's state chip (halted / enforced), keeping consecutive-losses and drawdown values in the chip's detail. Hero + 4 metrics, next decision, and the pause action are unchanged. |
| **Queue** | Ready groups unchanged. "No-bet decisions" moves behind a **count row that expands** (`12 no-bet decisions · fail-closed`). Expanding shows today's cards unchanged, criteria and provenance intact. |
| **Trades** | The filters row's prose note becomes a single muted line; the list is unchanged. |
| **Results** | Unchanged (4 metrics + chart + paper→live gate already satisfies R1–R3). |
| **More** | Split the 8 links into **two groups of 4** so the surface obeys R2. Appearance, signed-in identity and sign out unchanged. |
| **Alerts / Audit / Connections / Manual bets** | Standardise on one card pattern; drop repeated intro copy. All rows, severities, timestamps, actors and acknowledge/decide actions retained. |
| **Models** | Keep every metric table (operator exemption). Remove the duplicated intro copy; market sections collapse to one at a time. |
| **Risk controls** | Keep the 6 limit metrics and the type-to-confirm resume, **including the exact expected strings** (`RESUME LIVE TRADING` / `RESUME PAPER TRADING`). Only the preamble prose is trimmed. |
| **Pilot access** | Keep tabs, pending requests, search, membership cards, requirement checklist, appoint/revoke with required reasons, and membership history. Reduce to one card pattern. |
| **Live account review** | Keep the full evidence block line-for-line (evidence hash, owner, deposit wallet, deployment tx, approvals, pUSD, signer/wallet/bot lifecycle) and the required operator reason on canary release. Only spacing and headings change. |
| **`trade/[id]`** | Already the reference shape for progressive disclosure — no change. |

### 6.1 Unify the two tab bars

Replace `src/app/(tabs)/_layout.tsx` (`FloatingTabBar`) and `src/app/(consumer)/_layout.tsx`
(`ConsumerTabBar`) with **one shared component** (`src/components/tab-bar.tsx`) taking items,
labels and icons as props.

- Adopt the consumer bar's docked shape and icon + label slots (clearer than icon-only).
- Adopt the operator bar's reduced-motion handling and pressed-state haptics.
- Keep the operator's glass treatment on dark, with a solid-panel fallback when the glass API is
  unavailable — the existing behaviour, now shared.

This is the only structural refactor in the operator half of the app, and it changes no route.

---

## 7. Visual language

Applied to the consumer app; the operator console keeps its existing console aesthetic with the
density reductions above.

**Adopt (from the Finora reference)**

- **One giant figure** per screen — 38–48px, tight tracking. Everything else 12.5–17px.
- **Delta chips** beside the primary figure; never a second large number.
- **Section headers** — small muted label + optional `View all →`, replacing icon/title/description
  stacks.
- **Question-shaped action cards** with a single muted sub-line (R5).
- **Lens pills** directly under the page title (R3).
- **One bottom action dock** per screen (R7), including the single ask-anything-style affordance
  where a screen has exactly one primary action.
- **20–24px radii, opaque reading cards, generous whitespace.**

**Do not adopt:** a second accent colour (the operator's violet identity and the reserved red for
halted/blocked/destructive states are unchanged), metric-tile walls, or always-visible tables.

**Type and tokens are unchanged:** Manrope 700/800 display, Inter 400–700 body, existing radii and
semantic tokens, dark/light/system support.

### Reference set (for `docs/DESIGN_SYSTEM.md`)

| Reference | Use |
|---|---|
| [Finora — AI Finance & Money Management](https://dribbble.com/shots/27691063-Finora-AI-Finance-Money-Management-App-UI-UX) | **Primary structural reference**: one figure per screen, ≤3 sections, lens pills that replace pages, question-shaped action cards, `View all` depth, and a single bottom input dock. |
| [Fintech Mobile App — Dark Dashboard UI](https://dribbble.com/shots/27014397-Fintech-Mobile-App-Dark-Dashboard-UI) | Retained: layered dark surfaces and compact overview hierarchy. |
| [AI Investment Mobile Dashboard](https://dribbble.com/shots/27143330-AI-Investment-App-UI-UX-Fintech-Service-Mobile-Dashboard) | Retained: AI insight and portfolio-performance grouping. |
| [The Bullish Trade](https://dribbble.com/shots/27079280-The-Bullish-Trade-Dark-Fintech-Mobile-App-Design) | Retained: calm data density, restrained gradients, high-contrast figures. |
| [Dynamic Sports Analytics Dashboard](https://dribbble.com/shots/25514823) | **Negative reference**: the metric-tile wall and neon-on-black density this proposal moves the consumer app away from. Operator screens are the deliberate exception. |

---

## 8. Safety contract checklist

Each contract is restated from `docs/DESIGN_SYSTEM.md` with the evidence that the proposal preserves
it.

| Contract | Still satisfied by |
|---|---|
| Red is reserved for halted, failed, blocked or destructive states | Preserved. The proposal adds no colour and removes no destructive affordance. `Close risk now` stays on the position it belongs to. |
| Never display a control that can activate live trading from the mobile app | Preserved. No control is added, moved to a shallower surface, or re-labelled. The live-access **approval checklist** is evidence, and it now expands inside `Account → Wallet & live access` — still read-only. |
| Model promotion remains an authenticated, audited admin workflow | Preserved. Models, Risk controls and Pilot access keep every fact and action; only copy and grouping change. |
| The paper-to-live graduation gate is explicit | Preserved. The gate card in Results keeps `settled/required`, `days/required` and its ELIGIBLE/LOCKED state. |
| Typed resume confirmation strings stay exact | Preserved verbatim: `RESUME LIVE TRADING` / `RESUME PAPER TRADING`. |
| Read-only whenever the backend snapshot is stale or unavailable | Preserved. `ResourceState` and the stale/error gating are untouched on every screen; collapsed sections do not bypass it. |
| Shadow output is explicitly research-only | Preserved. No shadow/rollout label is removed anywhere. |
| No-bet cards lead with failed criteria, observed value and threshold | Preserved. Queue's no-bets are **collapsed behind a count row**, not summarised into a count-only view — expanding reveals today's cards unchanged. |
| Decision detail shows applied probability, provenance, criteria, mapping evidence and price snapshots | Preserved. `trade/[id]` is unchanged. |
| Operator actions emit audit records | Preserved. No action's trigger surface is removed; acknowledge, pause, resume, cancel, approve/reject and canary release all remain reachable. |
| Wallet, approval and audit evidence remain reachable | Preserved by the reachability matrix in §9. Relocated, never deleted. |

---

## 9. Reachability matrix (every relocation, ≤2 taps)

| Relocated item | New home | Taps |
|---|---|---|
| Decision ledger (ex-Activity tab) | Portfolio → Decisions lens | 1 (Portfolio) + 1 |
| Double-chance overview | Portfolio → Positions lens | 1 + 1 |
| Exact snapshots table | Portfolio → Performance → `View all snapshots` | 1 + 1 |
| Trading budgets | Portfolio → Performance → `Edit` sheet | 1 + 1 |
| Live wallet balance + funding thresholds | Account → Wallet & live access | 1 (Account) |
| Wallet link/create/deposit routes | Account → Wallet & live access (expanded) | 2 |
| Live-trading approval checklist + signer | Account → Wallet & live access (expanded) | 2 |
| Subscription / restore purchases | Account → Subscription | 1 (Account) |
| Notifications + appearance | Account → Preferences | 1 (Account) |
| Safety & disclosures, account controls | Account → Safety & disclosures | 2 |
| How paper trading works / setup guide | Account → How PolyClaw works | 2 |
| Country, invite code and the two consents | Bot → Start-bot sheet (dock) | 1 (Bot) + 1 |
| Request pilot access | Bot → "Need access to continue?" row | 1 + 1 |
| Manual football orders + manual budget | Portfolio → Manual lens | 1 + 1 |
| Linked Polymarket positions | Portfolio → Linked lens | 1 + 1 |
| Football trading entry | Bot → Football trading row | 1 + 1 |
| Operator session funnel (8 steps) | Monitor → expanding summary line | 0 (inline) |
| Operator risk guardrails | Monitor → hero state chip detail | 0 (inline) |
| Operator no-bet decisions + criteria + provenance | Queue → expanding count row | 0 (inline) |
| Operator Models metric tables, risk limits, pilot administration, live-account evidence, alerts, audit, connections, manual bets | Their existing routes | 1 (More) + 1 |

No capability requires more than two taps from the tab bar.

---

## 10. Implementation sequence (for a later, separately approved change)

1. **Shared tab bar** — extract `src/components/tab-bar.tsx`; point both layouts at it. No route change.
2. **Consumer tab model** — 5 → 4 tabs; move `activity` to a hidden route; retarget deep links.
3. **Portfolio lenses** — build the lens row, absorb Decisions, move snapshots and budgets behind
   disclosure.
4. **Home rebuild** — drop the duplicate chart controls, cap decisions at 3, add the conditional
   question card and dock.
5. **Bot rebuild** — status/risk/trade-cap rows and the Start-bot sheet (consents preserved).
6. **Account rebuild** — 2 groups × 4 rows with the wallet/live-access expander.
7. **Operator presentation pass** — Monitor funnel collapse, Queue no-bet collapse, More grouping,
   copy trimming on the detail routes.

Verification for that later step: `npx tsc --noEmit` and `npm run lint` must pass, plus a simulator
pass on Home, Portfolio (all lenses), Bot (including the Start-bot sheet and both consents), Account
(wallet expander), Monitor (funnel expand), Queue (no-bet expand) and Risk controls (the exact
confirmation string).

---

## 11. Open decisions

1. **Portfolio lens order** — proposed `Performance · Decisions · Positions · Manual · Linked`. If
   five lenses crowd the row on small phones, `Manual` merges into `Positions`.
2. **Home chart** — whether Home keeps a chart at all, or defers entirely to Portfolio. The proposal
   keeps one chart because it is the screen's only visual proof of performance.
3. **Operator `More` grouping** — two groups of four assumes the eight links keep their current
   labels; confirm if the labels change.
4. **Feature flag** — `features.manualFootballTrading` remains `false`, so `football-trade` stays
   hidden and the Football trading row stays unrendered until the flag flips.
