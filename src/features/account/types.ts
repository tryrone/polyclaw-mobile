export type AccountSectionKey =
  | 'subscription'
  | 'wallet'
  | 'approval'
  | 'signer'
  | 'notifications'
  | 'appearance'
  | 'guide'
  | 'safety'
  | 'controls';

export type BusyOperation =
  | 'purchase'
  | 'manage'
  | 'restore'
  | 'challenge'
  | 'verify'
  | 'deposit'
  | 'approve-wallet'
  | 'withdrawal'
  | 'review'
  | 'renew'
  | 'revoke'
  | 'enable'
  | 'disable'
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
  id: string;
  label: string;
  detail: string;
  passed: boolean;
};
