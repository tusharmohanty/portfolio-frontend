export type TierKey = 'CONFIRMED' | 'WATCH' | 'CAUTION';
export type ColumnType = 'PRICE' | 'PERCENT' | 'RATIO' | 'NUMBER' | 'TEXT' | 'DATE';
export type ColumnRole = 'IDENTITY' | 'PRICE' | 'INDICATOR' | 'SIGNAL' | 'SCORE';
export type ColumnHighlight = 'HIGH' | 'LOW' | 'NONE';
export type RuleOperator = 'LT' | 'LTE' | 'GT' | 'GTE';

export interface ScanColumn {
  key: string;
  label: string;
  type: ColumnType;
  role: ColumnRole;
  highlight: ColumnHighlight;
}

export interface TierSummary {
  key: TierKey;
  label: string;
  description: string;
  count: number;
}

export interface ScanClassifierRule {
  tier: TierKey;
  columnKey: string;
  operator: RuleOperator;
  threshold: number;
  sortOrder: number;
}

export interface ScanRuleEvaluation {
  tier: TierKey;
  columnKey: string;
  operator: RuleOperator;
  threshold: number;
  value: number;
  passed: boolean;
}

export interface ScanResultRow {
  tier: TierKey;
  tier_attribution: ScanRuleEvaluation[];
  [key: string]: unknown;
}

export interface ScanResult {
  scanId: string;
  scanName: string;
  scanDescription: string;
  asOf: string;
  scoreKey: string;
  resultCount: number;
  tiers: TierSummary[];
  columns: ScanColumn[];
  classifierRules: ScanClassifierRule[];
  results: ScanResultRow[];
}

export interface ScanDefinition {
  id: string;
  name: string;
  description: string;
  scoreKey: string;
  columns: ScanColumn[];
  tiers: ScanTier[];
  classifierRules: ScanClassifierRule[];
}

export interface ScanTier {
  key: TierKey;
  label: string;
  description: string;
}
