# PolyClaw mobile design system

## Product character

PolyClaw mobile ships two surfaces from one binary, and they have different jobs.

- **Consumer surface** (`USER`): quiet, confident and paper-first — **three tabs (Home, Trades, Account)**. A consumer only needs to know what they hold, what is invested, what their bot is doing and what it has traded; Portfolio and Bot are detail screens reached from Home. It shows one number, one action and one honest status, and it never implies that paper activity is live capital.
- **Operator surface** (`ADMIN`): an operational console — five tabs (Monitor, Queue, Trades, Results, More) plus nine detail routes. It is precise and evidence-heavy, and it must communicate whether a model is shadowing, eligible, active, paused, fallback, or blocked.

Both surfaces share one tab bar component, one type scale, one token set and the density rules below.

## Applied foundation

- Display type: Manrope 700/800 for titles and operational figures.
- Body type: Inter 400–700 for tables, criteria, identifiers, and timestamps.
- Color: **light-first**, derived from the Finora reference — a near-white ground with a faint lavender cast (`#F3F3F7`), white cards, near-black ink (`#0C0D12`) and one restrained violet-blue accent (`#625BD8`). Green, amber and rose are reserved for enforced semantic states and chart datapoints, never decoration. A calm dark palette remains available through the Appearance toggle and is no longer the default.
- Surfaces: soft, low-contrast, generously rounded (16/24 radii) with shallow shadows; separation comes from surface tone and whitespace rather than heavy borders.
- Type: **Manrope across the whole surface** (300 for oversized secondary headlines, 400/500 body, 600/700 labels, 800 for hero figures), replacing the earlier Manrope-display + Inter-body split.
- Shape: 10/16/24 radii; status pills remain compact and consistent.
- Layout: progressively disclosed cards; high-level monitor first, decision evidence one tap deeper.
- Motion: short spring entrance and tactile response only; reduced-motion settings disable ornamental movement.
- Themes: all operational screens support dark, light, and system modes through semantic tokens.

## Density and disclosure rules

Applies to the consumer surface in full, and to the operator surface except where evidence
completeness requires more. Enforced by `docs/SIMPLIFICATION-PROPOSAL.md`.

1. **One primary number per screen.** Supporting figures are capped at four.
2. **Max three sections per scroll; max four rows per section.** Ledgers, trade lists and audit lists
   are exempt from the row cap but must keep at most three chrome elements above the list.
3. **Lenses replace pages.** Sibling screens become pill switchers on one surface (for example
   Portfolio's Performance · Decisions · Positions · Manual · Linked).
4. **Depth lives behind `View all →`.**
5. **Action cards are question-shaped**, with one muted sub-line.
6. **One accent colour per surface.** Violet is operator identity, not success; red stays reserved.
7. **One bottom action dock** per screen, carrying that screen's single primary action.

Operator exemption: Monitor's funnel, Queue's no-bet criteria and Models' metric tables may exceed
the row cap, but they must be **collapsed behind a single expanding row**, never deleted or
summarised into a count-only view.

## Component rules

Consumer surface:

- Portfolio is a lensed surface; a new report or list belongs in a lens, not a new tab.
- Bot shows status, risk and trade cap as three rows plus one dock. Country, invite code and both
  consent checkboxes remain verbatim inside the Start-bot sheet.
- Wallet link/create/deposit routes and the live-access approval checklist collapse into one
  `Wallet & live access` expander in Account — relocated, never removed.
- Everything a consumer needs stays reachable in two taps from the tab bar.

Operator surface:

- Every session can expose the funnel: discovered, supported, confidently matched, quoted, forecasted, passed, selected, filled.
- No-bet cards lead with failed criteria, observed value, and threshold. Rejection is a safety outcome, not an error.
- Decision detail shows applied probability, component provenance, criteria, mapping evidence, and price snapshots.
- Shadow predictions are explicitly research-only. Rollout percentages refer to paper canaries unless a separately approved live implementation exists.
- Red is reserved for halted, failed, blocked, or destructive states. Violet is identity, not success.
- Never display a control that can activate live trading from the mobile app. Model promotion remains an authenticated, audited admin workflow.

## Visual research used as inspiration

These are mood and density references, not source components to copy:

- [Finora — AI Finance & Money Management App UI/UX](https://dribbble.com/shots/27691063-Finora-AI-Finance-Money-Management-App-UI-UX): the primary structural reference — one large figure per screen, at most three sections, lens pills that replace pages, question-shaped action cards, `View all` depth, and a single bottom action dock.
- [Fintech Mobile App — Dark Dashboard UI](https://dribbble.com/shots/27014397-Fintech-Mobile-App-Dark-Dashboard-UI): layered dark surfaces and compact overview hierarchy.
- [AI Investment Mobile Dashboard](https://dribbble.com/shots/27143330-AI-Investment-App-UI-UX-Fintech-Service-Mobile-Dashboard): AI insight and portfolio-performance grouping.
- [The Bullish Trade](https://dribbble.com/shots/27079280-The-Bullish-Trade-Dark-Fintech-Mobile-App-Design): calm data density, restrained gradients, high-contrast figures.
- [Dynamic Sports Analytics Dashboard](https://dribbble.com/shots/25514823): **negative reference** — a metric-tile wall of a dozen simultaneous widgets. The consumer surface must not resemble this; operator screens are the deliberate exception.

Dribbble shots are aesthetic references. PolyClaw's operational truth, accessibility, control boundaries, and audit evidence remain authoritative.
