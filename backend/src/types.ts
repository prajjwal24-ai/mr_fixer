export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingCategory = 'accessibility' | 'layout';
export type FindingConfidence = 'definitive' | 'needs_review';

export interface AuditFinding {
  fingerprint: string;
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  url: string;
  element: string; // CSS selector or element summary
  snippet?: string; // HTML snippet if available
  evidence: string;
  suggestedFix: string;
  confidence: FindingConfidence;
  requiresHumanReview: boolean;
}

export interface AuditSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  requiresHumanReviewCount: number;
  categories: {
    accessibility: number;
    layout: number;
  };
}

export interface AuditReport {
  id: string;
  url: string;
  finalUrl: string;
  pageTitle: string;
  httpStatus: number;
  timestamp: string;
  loadTimeMs: number;
  summary: AuditSummary;
  findings: AuditFinding[];
}

export interface RescanVerification {
  previousCount: number;
  freshCount: number;
  persistingFingerprints: string[];
  resolvedFingerprints: string[];
  newFingerprints: string[];
}

export interface RescanReport {
  report: AuditReport;
  verification: RescanVerification;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime?: number;
  environment?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
