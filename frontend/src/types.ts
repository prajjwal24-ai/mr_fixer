export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingCategory = 'accessibility' | 'layout' | 'seo' | 'security' | 'performance';
export type FindingConfidence = 'definitive' | 'needs_review';

export interface CodeExample {
  before: string;
  after: string;
  explanation: string;
}

export interface FurtherGuidance {
  simplerExplanation: string;
  alternativeExample?: string;
  frameworkGuidance?: {
    react?: string;
    vue?: string;
    tailwind?: string;
  };
}

export interface AuditFinding {
  fingerprint: string;
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  url: string;
  element: string;
  snippet?: string;
  evidence: string;
  suggestedFix: string;
  confidence: FindingConfidence;
  requiresHumanReview: boolean;
  helpUrl?: string;
  whatIsWrong?: string;
  whyItMatters?: string;
  stepByStepFix?: string[];
  codeExample?: CodeExample;
  furtherGuidance?: FurtherGuidance;
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
    seo?: number;
    security?: number;
    performance?: number;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HealthData {
  status: 'ok';
  timestamp: string;
  uptime?: number;
  environment?: string;
}
