export type Mode = 'PAPER' | 'LIVE';
export type SafetyState = Mode | 'HALTED' | 'RECONCILING';
export type TradeStatus = 'PLANNED' | 'SUBMITTING' | 'PLACED' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'EXPIRED' | 'SETTLED';

export type OperatorEnvelope<T> = {
  serverTime: string;
  asOf: string;
  staleAfter: string;
  data: T;
};

export type OperatorUser = { id: string; email: string; name: string | null; role: 'USER' | 'ADMIN' };
export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  user: OperatorUser;
};

export type ConsumerDashboard = {
  mode: 'PAPER';
  liveTradingEnabled: false;
  profile: {
    riskAppetite: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
    maximumTradeUsdc: number;
    paperBankrollUsdc: number;
    botState: 'SETUP' | 'ACTIVE' | 'PAUSED_USER' | 'PAUSED_SAFETY' | 'PAUSED_BILLING' | 'CLOSED';
    pauseReason?: string | null;
  };
  entitlement: null | { status: string; trialEndsAt?: string | null; currentPeriodEnd?: string | null; active: boolean };
  positions: {
    id: string; fixtureLabel: string; selectionLabel: string; market: string; probability: number;
    entryPrice: number; plannedStakeUsdc: number; status: 'OPEN' | 'SKIPPED' | 'SETTLED' | 'CANCELLED';
    realizedPnlUsdc?: number | null; rejectionReasons?: string[] | null; createdAt: string;
  }[];
  summary: { dailyExposureUsdc: number; openExposureUsdc: number; openPositions: number; availableBalanceUsdc: number; realizedPnlUsdc: number; equityUsdc: number; drawdownFraction: number };
  riskLimits: { stakeBankrollFraction: number; dailyExposureBankrollFraction: number; maximumDrawdownFraction: number };
  release: { activationRequiresInvite: boolean };
  access: { mode: 'PILOT' | 'HYBRID' | 'SUBSCRIPTION'; active: boolean; source: 'PILOT' | 'SUBSCRIPTION' | null; pilotGrant?: { status: string; startsAt: string; expiresAt: string } | null };
};

export type ConsumerMode = 'PAPER' | 'LIVE_LOCKED' | 'LIVE';
export type ConsumerPortfolioPoint = { at: string; equityUsdc: number; tradingPnlUsdc: number; returnFraction: number; drawdownFraction: number; source: 'BOT' | 'MANUAL' | 'COMBINED' };
export type ConsumerManualOrder = {
  id: string; fixtureLabel: string; marketLabel: string; selectionLabel: string; kickoff: string; limitPrice: number;
  requestedStakeUsdc: number; approvedStakeUsdc: number; estimatedShares: number; maximumLossUsdc: number;
  possiblePayoutUsdc: number; estimatedFeeUsdc: number; quoteTakenAt: string; quoteExpiresAt: string; status: string; mode: ConsumerMode;
  rejectionReasons?: string[] | null; walletSigningPayload?: string | null;
};
export type ConsumerPortfolio = {
  range: '1W' | '1M' | '3M' | 'ALL'; source: 'BOT' | 'MANUAL' | 'COMBINED'; mode: ConsumerMode;
  summary: { equityUsdc: number; tradingPnlUsdc: number; returnFraction: number; drawdownFraction: number; realizedPnlUsdc: number; unrealizedPnlUsdc: number; feesUsdc: number };
  budgets: { botBudgetUsdc: number; manualBudgetUsdc: number; unallocatedUsdc: number };
  positions: ConsumerDashboard['positions']; manualOrders: ConsumerManualOrder[];
  livePositions: { id: string; conditionId: string; tokenId: string; fixtureLabel: string; marketLabel: string; selectionLabel: string; openedStakeUsdc: number; positionShares: number; currentValueUsdc: number; realizedPnlUsdc: number; unrealizedPnlUsdc: number; status: string; openedAt: string }[];
  polymarketPositions: { asset?: string; conditionId?: string; size?: number; avgPrice?: number; currentValue?: number; cashPnl?: number; realizedPnl?: number; curPrice?: number; title?: string; outcome?: string; endDate?: string; redeemable?: boolean }[];
  series: ConsumerPortfolioPoint[];
};
export type ConsumerFootballMarket = {
  eventId: string; marketId: string; conditionId: string; tokenId: string; sport: 'football'; eventTitle: string; question: string;
  marketLabel: string; selectionLabel: string; kickoff: string; active: boolean; closed: boolean; acceptingOrders: boolean;
  competition: string | null; country: string | null; homeTeam: string | null; awayTeam: string | null; liquidityUsdc: number;
};
export type ConsumerFootballCatalogue = { items: ConsumerFootballMarket[]; nextCursor: string | null; total: number; asOf: string };
export type ConsumerAccount = {
  mode: ConsumerMode; readOnlyAddress?: string | null; embeddedOwnerAddress?: string | null; depositWalletAddress?: string | null; walletStatus: string; walletLifecycle: string; botLifecycle: string; eligibilityCode?: string | null; availablePusd: number;
  approvalStatus: string; signerStatus: string; signerExpiresAt?: string | null; offboardingState: string;
  notifications: { authorizationExpiry: boolean; orderUpdates: boolean; riskHalts: boolean; billingWindDown: boolean; eligibilityLoss: boolean; marketing: boolean };
  approval: { paperDays: number; settledBotPositions: number; globalEngineApproved: boolean; platformApproved: boolean; manualLiveEligible: boolean; botLiveEligible: boolean; manualReasons: string[]; botReasons: string[] };
  funding: { minimumReadyPusd: number; minimumEntryPusd: number };
  access: { mode: 'PILOT' | 'HYBRID' | 'SUBSCRIPTION'; active: boolean; source: 'PILOT' | 'SUBSCRIPTION' | null; pilotGrant?: { status: string; startsAt: string; expiresAt: string; walletCapPusd: number; canaryAttemptsUsed: number; canaryAttemptLimit: number } | null };
};

export type OwnerActionPreparation = {
  id: string;
  typedData: Record<string, unknown>;
  status: string;
};

export type DepositSetup = {
  addresses: { evm?: string; svm?: string; btc?: string; tron?: string; [key: string]: string | undefined };
  supportedAssets: { chainId: string; assetId?: string; tokenAddress?: string; symbol?: string; name?: string; decimals?: number }[];
  note: string | null;
};

export type Trade = {
  id: string;
  clientOrderId: string;
  venue: 'POLYMARKET' | 'SPORTYBET';
  mode: Mode;
  status: TradeStatus;
  fixtureId?: string | null;
  fixtureLabel: string;
  market: string;
  side: string;
  plannedStake: number;
  filledSize: number;
  entryPrice: number;
  averageFillPrice?: number | null;
  probability: number;
  probabilityProvenance?: {
    forecastId?: string | null;
    decisionMode?: 'BASELINE' | 'SHADOW' | 'ACTIVE' | null;
    modelVersion?: string | null;
    modelHealth?: 'HEALTHY' | 'FALLBACK' | 'BLOCKED' | 'DISABLED' | null;
    bookmakerProb?: number | null;
    dixonColesProb?: number | null;
    catboostProb?: number | null;
    ensembleProb?: number | null;
    appliedProb: number;
  };
  edge: number;
  feePaid: number;
  pnl?: number | null;
  outcome?: string | null;
  exchangeOrderId?: string | null;
  kickoff: string;
  session: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  intentCreatedAt: string;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  settledAt?: string | null;
  evidence?: unknown;
  criteria?: DecisionCriterion[];
  priceSnapshots?: PriceSnapshot[];
};

export type DecisionCriterion = {
  criterion: string;
  pass: boolean;
  value: number | string | boolean | null;
  threshold?: number | string;
};

export type PriceSnapshot = {
  kind: string;
  bid: number;
  ask: number;
  takenAt: string;
};

export type SessionSummary = {
  mode?: Mode;
  discovered?: number;
  supported?: number;
  confident?: number;
  quoted?: number;
  forecasted?: number;
  passedGates?: number;
  selected?: number;
  planned?: number;
  filled?: number;
  preparation?: {
    requested?: number;
    enriched?: number;
    oddsRefreshed?: number;
    ready?: number;
    failures?: { fixtureId: string; stage: string; reason: string }[];
  };
};

export type Overview = {
  mode: Mode;
  safetyState: SafetyState;
  bankroll: number;
  availableBalance: number;
  openExposure: number;
  dailyExposureLimit: number;
  realizedPnl: number;
  roi: number;
  drawdown: number;
  risk: { halted: boolean; haltReason?: string | null; consecutiveLosses: number; warningThreshold: number; haltThreshold: number; configVersion: string };
  sessions: { id: string; slot: 'MORNING' | 'AFTERNOON' | 'NIGHT'; status: string; haltReason?: string | null; summary?: SessionSummary | null; createdAt: string }[];
  upcomingTrade: Trade | null;
};

export type QueueData = {
  ready: Trade[];
  noBet: {
    id: string;
    fixtureId?: string | null;
    gammaId: string;
    session: string;
    reasons: DecisionCriterion[] | unknown;
    probabilityProvenance?: Trade['probabilityProvenance'];
    createdAt: string;
  }[];
};

export type TradesData = { items: Trade[]; nextCursor?: string | null };
export type Performance = {
  settledTrades: number;
  wins: number;
  losses: number;
  hitRate: number;
  netPnl: number;
  paperGate: { settled: number; requiredSettled: number; days: number; requiredDays: number; positiveNetPnl: boolean; eligible: boolean };
  series: { date: string; bankroll: number; highWaterMark: number }[];
};

export type RiskData = {
  tradingHalted: boolean;
  haltReason?: string | null;
  consecutiveLosses: number;
  executionMode: Mode;
  updatedAt: string;
  limits: { fixedStake: number; maxDailyExposure: number; maxOpenExposure: number; maxTradesPerSession: number; drawdownWarning: number; drawdownHalt: number; consecutiveLossHalt: number };
  current: Overview;
};

export type Connections = {
  polymarket: { automation: boolean; configured: boolean; environment: string; status: string; collateral: string };
  sportyBet: { automation: boolean; configured: boolean; status: string };
  research: { configured: boolean; mode: string; status: string };
};

export type AlertItem = { id: string; severity: 'INFO' | 'WARNING' | 'CRITICAL'; title: string; description: string; resource?: string | null; resourceId?: string | null; acknowledgedAt?: string | null; createdAt: string };
export type AuditItem = { id: string; actorId: string; action: string; targetType?: string | null; targetId?: string | null; createdAt: string };
export type ManualBet = { id: string; fixtureLabel: string; marketLabel: string; proposedOdds: number; acceptedOdds?: number | null; plannedStake: number; transactionCode?: string | null; status: string; expiresAt: string; createdAt: string };
export type ItemsData<T> = { items: T[] };

export type ModelMarketMetrics = {
  sample?: number;
  ensembleBrier?: number | null;
  dixonColesBrier?: number | null;
  catboostBrier?: number | null;
  bookmakerBrier?: number | null;
  heuristicBrier?: number | null;
  ensembleLogLoss?: number | null;
  bookmakerLogLoss?: number | null;
  heuristicLogLoss?: number | null;
};
export type ModelOverallMetrics = ModelMarketMetrics;
export type ModelArtifactHealth = {
  version: string;
  artifactSha256: string;
  metrics: { overall?: ModelOverallMetrics; markets?: Record<string, ModelMarketMetrics>; catboostAvailable?: boolean; catboostTrained?: boolean };
  metadata: { catboostAvailable?: boolean; catboostTrained?: boolean; dixonMatches?: number; format?: string };
  componentVersions?: Record<string, string>;
  components?: Record<string, { version: string; artifactSha256: string | null; status: string }>;
};
export type ModelConsumerHealth = {
  consumer: 'BETCLAW' | 'POLYCLAW';
  status: 'SHADOW' | 'ELIGIBLE' | 'ACTIVE' | 'FALLBACK' | 'BLOCKED';
  activeVersion: string | null;
  previousVersion: string | null;
  candidateSince?: string | null;
  promotionsPaused: boolean;
  eligible: boolean;
  candidate: null | ModelArtifactHealth & {
    shadowStartedAt: string;
  };
  active: null | ModelArtifactHealth & { activatedAt?: string | null };
  evidence: Record<string, unknown>;
  gates: { key: string; pass: boolean; detail: string }[];
  drift: { brierDelta: number | null; status: 'STABLE' | 'WATCH' | 'INSUFFICIENT_DATA' };
  trend: { version: string; createdAt: string; metrics: ModelOverallMetrics }[];
};
export type ModelsData = {
  service: { status: string; catboostAvailable: boolean; loadedVersions: string[]; error?: string };
  consumers: ModelConsumerHealth[];
  updatedAt: string;
  marketActivationMode?: 'off' | 'shadow' | 'on';
  marketActivations?: ModelMarketActivation[];
};

export type ModelMarketActivation = {
  id: string;
  consumer: 'BETCLAW' | 'POLYCLAW';
  marketType: 'O15' | 'O25' | 'U35' | 'U45';
  candidateVersion: string | null;
  activeVersion: string | null;
  promotionsPaused: boolean;
  rolloutPercent: number;
  pauseReason?: string | null;
  candidateSince?: string | null;
  activatedAt?: string | null;
  rolloutChangedAt?: string | null;
  performance?: {
    forecasts: number;
    settledForecasts: number;
    mappingErrors: number;
    ensembleBrier: number | null;
    bookmakerBrier: number | null;
    heuristicBrier: number | null;
    policyRoi: number | null;
  } | null;
};
