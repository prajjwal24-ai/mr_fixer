import { useState } from 'react';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AuditReport, RescanVerification } from '../types.ts';

interface ExportButtonProps {
  report: AuditReport;
  rescanVerification: RescanVerification | null;
}

interface ExportPayload {
  exportedAt: string;
  tool: string;
  version: string;
  scan: {
    url: string;
    finalUrl: string;
    pageTitle: string;
    httpStatus: number;
    scanTimestamp: string;
    loadTimeMs: number;
    auditId: string;
  };
  summary: AuditReport['summary'];
  rescanComparison: {
    available: boolean;
    previousCount?: number;
    freshCount?: number;
    resolvedCount?: number;
    persistingCount?: number;
    newCount?: number;
    resolvedFingerprints?: string[];
    persistingFingerprints?: string[];
    newFingerprints?: string[];
  };
  findings: AuditReport['findings'];
}

/**
 * Produces a safe, filesystem-compatible filename from a URL and timestamp.
 * e.g. "mr-fixer-report-example.com-2024-05-01T12-00-00.json"
 */
function buildFilename(url: string, timestamp: string): string {
  try {
    const { hostname } = new URL(url);
    const safeName = hostname.replace(/[^a-zA-Z0-9.-]/g, '-').slice(0, 40);
    // ISO string like 2024-05-01T12:00:00.000Z → replace colons and dots
    const safeTs = timestamp.replace(/[:.]/g, '-').replace('Z', '').slice(0, 19);
    return `mr-fixer-report-${safeName}-${safeTs}.json`;
  } catch {
    return 'mr-fixer-report.json';
  }
}

/**
 * Builds the full export payload from actual report data.
 * Never invents or fabricates fields.
 */
function buildExportPayload(
  report: AuditReport,
  rescanVerification: RescanVerification | null
): ExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    tool: 'Mr. Fixer',
    version: '0.1.0',
    scan: {
      url: report.url,
      finalUrl: report.finalUrl,
      pageTitle: report.pageTitle,
      httpStatus: report.httpStatus,
      scanTimestamp: report.timestamp,
      loadTimeMs: report.loadTimeMs,
      auditId: report.id,
    },
    summary: report.summary,
    rescanComparison: rescanVerification
      ? {
          available: true,
          previousCount: rescanVerification.previousCount,
          freshCount: rescanVerification.freshCount,
          resolvedCount: rescanVerification.resolvedFingerprints.length,
          persistingCount: rescanVerification.persistingFingerprints.length,
          newCount: rescanVerification.newFingerprints.length,
          resolvedFingerprints: rescanVerification.resolvedFingerprints,
          persistingFingerprints: rescanVerification.persistingFingerprints,
          newFingerprints: rescanVerification.newFingerprints,
        }
      : { available: false },
    findings: report.findings,
  };
}

export function ExportButton({ report, rescanVerification }: ExportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  function handleExport() {
    try {
      const payload = buildExportPayload(report, rescanVerification);
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = buildFilename(report.url, report.timestamp);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const icon =
    status === 'success' ? (
      <CheckCircle2 size={15} />
    ) : status === 'error' ? (
      <AlertCircle size={15} />
    ) : (
      <Download size={15} />
    );

  const label =
    status === 'success'
      ? 'Downloaded!'
      : status === 'error'
        ? 'Export Failed'
        : 'Export JSON';

  const colorMap = {
    idle: {
      color: '#94a3b8',
      bg: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 255, 255, 0.10)',
    },
    success: {
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)',
    },
    error: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
    },
  }[status];

  return (
    <button
      type="button"
      onClick={handleExport}
      aria-label={`Export audit report as JSON (${report.findings.length} finding${report.findings.length !== 1 ? 's' : ''})`}
      title={`Export audit report as JSON (${report.findings.length} finding${report.findings.length !== 1 ? 's' : ''})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.375rem 0.875rem',
        borderRadius: '0.5rem',
        fontSize: '0.775rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        color: colorMap.color,
        background: colorMap.bg,
        border: `1px solid ${colorMap.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
