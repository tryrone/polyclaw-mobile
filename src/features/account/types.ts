export type AccountSectionKey =
  | 'subscription'
  | 'wallet'
  | 'approval'
  | 'signer'
  | 'notifications'
  | 'appearance'
  | 'safety'
  | 'controls';

export type BusyOperation =
  | 'purchase'
  | 'manage'
  | 'restore'
  | 'challenge'
  | 'verify'
  | 'deposit'
  | 'review'
  | 'renew'
  | 'revoke'
  | 'notifications'
  | 'disconnect'
  | 'delete';

export type AccountMessage = {
  text: string;
  tone: 'success' | 'warning' | 'danger';
} | null;

export type RiskAcknowledgements = {
  fullLoss: boolean;
  unfilled: boolean;
  noGuarantee: boolean;
};

export type ApprovalChecklistItem = {
  label: string;
  passed: boolean;
};
