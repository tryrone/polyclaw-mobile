# PolyClaw Mobile

Standalone Expo SDK 57 operator application for monitoring PolyClaw paper and live trading. This is intentionally separate from betclaw-mobile.

## Operator capabilities

- Monitor bankroll, P&L, exposure, drawdown, execution mode, and halt state.
- Review planned trades before submission and cancel only PLANNED intents.
- Browse clearly labelled paper/live history and paper-to-live readiness.
- Inspect server-enforced risk limits and pause or explicitly resume trading.
- Monitor Polymarket, SportyBet manual execution, and research connections.
- Record or reject manual SportyBet handoffs without storing bookmaker credentials.
- Receive operational alerts and review the append-only operator audit trail.

The app becomes read-only whenever the backend snapshot is stale or unavailable. Trading authority, secrets, idempotency, limits, and audit records stay server-side.

## Local setup

    cp .env.example .env
    npm install
    npx expo start

EXPO_PUBLIC_API_URL points to the BetClaw web application, not directly to PolyClaw. On a physical device it must be a reachable HTTPS address. EXPO_PUBLIC_EXPO_PROJECT_ID enables Expo push-token registration.

Only BetClaw users with the ADMIN role can sign in. The web backend must configure:

    POLYCLAW_CONTROL_API_URL=http://127.0.0.1:4310/v1
    POLYCLAW_CONTROL_API_TOKEN=<shared-private-token>

The PolyClaw process must configure the matching CONTROL_API_TOKEN and run yarn control.

## Verification and private beta

    npx expo install --check
    npx tsc --noEmit
    npm run lint
    EXPO_PUBLIC_API_URL=https://example.invalid npx expo export --platform ios

Use eas build --profile preview for the initial private beta. Do not switch PolyClaw to live mode until venue credentials, collateral compatibility, reconciliation, and the paper-trading graduation gate are independently verified.

# polyclaw-mobile
