export type Mode = 'PAPER' | 'LIVE';
export type SafetyState = Mode | 'HALTED' | 'RECONCILING';
export type TradeStatus = 'PLANNED' | 'SUBMITTING' | 'PLACED' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'EXPIRED' | 'SETTLED';

export type OperatorEnvelope<T> = {
  serverTime: string;
  asOf: string;
  staleAfter: string;
  data: T;
};

export type OperatorUser = { id: string; email: string; name: string | null; role: string };
export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  user: OperatorUser;
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
  sessions: { id: string; slot: 'MORNING' | 'AFTERNOON' | 'NIGHT'; status: string; haltReason?: string | null; createdAt: string }[];
  upcomingTrade: Trade | null;
};

export type QueueData = {
  ready: Trade[];
  noBet: { id: string; fixtureId?: string | null; gammaId: string; session: string; reasons: unknown; createdAt: string }[];
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
};
