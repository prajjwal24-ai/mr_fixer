import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, AlertCircle, Wrench, Eye, ShieldAlert, Smartphone } from 'lucide-react';
import type { AuditFinding } from '../types.ts';

interface FindingCardProps {
  finding: AuditFinding;
  rescanStatus?: 'persisting' | 'new' | null;
}

export function FindingCard({ finding, rescanStatus }: FindingCardProps) {
  const [copied, setCopied] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Visual severity accent colors
  const severityColors = {
    critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.35)', bar: '#ef4444' },
    high: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)', bar: '#f59e0b' },
    medium: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', bar: '#38bdf8' },
    low: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.35)', bar: '#94a3b8' },
  }[finding.severity];

  return (
    <div className="glass-panel" style={{
      borderRadius: '0.875rem',
      padding: '1.25rem',
      marginBottom: '1rem',
      borderLeft: `4px solid ${severityColors.bar}`,
      transition: 'border 0.2s ease',
    }}>
      {/* Header Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Severity Badge */}
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            background: severityColors.bg,
            color: severityColors.text,
            border: `1px solid ${severityColors.border}`,
          }}>
            {finding.severity}
          </span>

          {/* Category Badge */}
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#cbd5e1',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            {finding.category === 'layout' ? <Smartphone size={11} /> : <AlertCircle size={11} />}
            {finding.category}
          </span>

          {/* Rule ID Tag */}
          <span style={{ fontSize: '0.725rem', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
            {finding.ruleId}
          </span>
        </div>

        {/* Rescan / Human Review Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {rescanStatus === 'persisting' && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              Persisting Defect
            </span>
          )}
          {rescanStatus === 'new' && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              Newly Introduced
            </span>
          )}
          {finding.requiresHumanReview && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Eye size={12} /> Needs Review
            </span>
          )}
        </div>
      </div>

      {/* Title / Message */}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.625rem', lineHeight: 1.4 }}>
        {finding.message}
      </h3>

      {/* Affected Element Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.35)',
        padding: '0.375rem 0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: '0.75rem',
        fontSize: '0.775rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Selector:</span>
          <code style={{ color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {finding.element}
          </code>
        </div>
        <button
          type="button"
          onClick={() => copyToClipboard(finding.element)}
          title="Copy selector"
          aria-label="Copy element selector"
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? '#10b981' : '#94a3b8',
            cursor: 'pointer',
            padding: '0.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.7rem',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Collapsible HTML Snippet (if available) */}
      {finding.snippet && (
        <div style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowSnippet(!showSnippet)}
            aria-expanded={showSnippet}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer',
              padding: '0.2rem 0',
            }}
          >
            {showSnippet ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>{showSnippet ? 'Hide HTML snippet' : 'View HTML snippet'}</span>
          </button>
          {showSnippet && (
            <pre style={{
              marginTop: '0.375rem',
              padding: '0.625rem',
              borderRadius: '0.5rem',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              fontSize: '0.75rem',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              <code>{finding.snippet}</code>
            </pre>
          )}
        </div>
      )}

      {/* Concrete Evidence Box */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '0.75rem 0.875rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.725rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          <ShieldAlert size={12} color="#f59e0b" /> Measured Evidence
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#cbd5e1', lineHeight: 1.5 }}>
          {finding.evidence}
        </p>
      </div>

      {/* Suggested Fix */}
      <div style={{
        background: 'rgba(56, 189, 248, 0.05)',
        padding: '0.75rem 0.875rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(56, 189, 248, 0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#38bdf8', fontSize: '0.725rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          <Wrench size={12} color="#38bdf8" /> Actionable Fix
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#f1f5f9', lineHeight: 1.5 }}>
          {finding.suggestedFix}
        </p>
      </div>
    </div>
  );
}
