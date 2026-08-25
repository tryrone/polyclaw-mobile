import type { DecisionCriterion } from '@/lib/types';

export function humanizeIdentifier(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatCriterionValue(value: DecisionCriterion['value']) {
  if (typeof value === 'number') return value.toFixed(Math.abs(value) < 1 ? 3 : 2);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value == null ? 'Not available' : String(value);
}

export function decisionModeLabel(value?: string | null) {
  return value === 'SHADOW' ? 'RESEARCH ONLY' : value ?? 'BASELINE';
}
