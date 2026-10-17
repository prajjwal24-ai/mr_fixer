import { AlertCircle, AlertTriangle, Info, Clock, CheckCircle2, Eye } from 'lucide-react';
import type { AuditReport } from '../types.ts';

interface AuditSummaryCardsProps {
  report: AuditReport;
}

export function AuditSummaryCards({ report }: AuditSummaryCardsProps) {
  const { summary, pageTitle, finalUrl, loadTimeMs, httpStatus } = report;

  return (
    <div style={{ width: '100%', maxWidth: '1000px', marginBottom: '1.5rem' }}>
      {/* Page Context Banner */}
      <div className="glass-panel" style={{ borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.125rem' }}>
            {pageTitle || 'Webpage Audit Report'}
          </h2>
          <a
            href={finalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.8125rem', color: '#38bdf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            {finalUrl}
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.775rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle2 size={13} /> HTTP {httpStatus}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Clock size={13} /> {loadTimeMs}ms
          </span>
        </div>
      </div>

      {/* Severity Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem' }}>
        {/* Total Findings */}
        <div className="glass-panel" style={{ borderRadius: '0.75rem', padding: '1rem', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Findings
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
            {summary.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Across 5 categories
          </div>
        </div>

        {/* Critical */}
        <div className="glass-panel" style={{ borderRadius: '0.75rem', padding: '1rem', borderLeft: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase' }}>
            <AlertCircle size={14} /> Critical
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>
            {summary.critical}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Zero accessible name/label
          </div>
        </div>

        {/* High */}
        <div className="glass-panel" style={{ borderRadius: '0.75rem', padding: '1rem', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>
            <AlertTriangle size={14} /> High
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
            {summary.high}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Alt missing, layout overflow
          </div>
        </div>

        {/* Medium */}
        <div className="glass-panel" style={{ borderRadius: '0.75rem', padding: '1rem', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>
            <Info size={14} /> Medium
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
            {summary.medium}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Headings, low contrast
          </div>
        </div>

        {/* Needs Human Review */}
        <div className="glass-panel" style={{ borderRadius: '0.75rem', padding: '1rem', borderLeft: '3px solid #a855f7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: '#a855f7', textTransform: 'uppercase' }}>
            <Eye size={14} /> Needs Review
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a855f7', marginTop: '0.25rem' }}>
            {summary.requiresHumanReviewCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Ambiguous intent (e.g. alt)
          </div>
        </div>
      </div>
    </div>
  );
}
