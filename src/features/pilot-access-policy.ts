export type PilotAccessGrantAction = 'grant' | 'renew';

export function pilotAccessPrimaryAction(grantActive: boolean): {
  action: PilotAccessGrantAction;
  label: string;
  successMessage: string;
} {
  return grantActive
    ? {
        action: 'renew',
        label: 'Renew 30-day pilot access',
        successMessage: 'Pilot access renewed for 30 days.',
      }
    : {
        action: 'grant',
        label: 'Grant 30-day pilot access',
        successMessage: 'Pilot access is active for 30 days.',
      };
}
