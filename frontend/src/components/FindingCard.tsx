import { useState } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Wrench,
  Eye,
  ShieldAlert,
  Smartphone,
  BookOpen,
  HelpCircle,
  ExternalLink,
  Code2,
  Info,
} from 'lucide-react';
import type { AuditFinding } from '../types.ts';

interface FindingCardProps {
  finding: AuditFinding;
  rescanStatus?: 'persisting' | 'new' | null;
}

export function FindingCard({ finding, rescanStatus }: FindingCardProps) {
  // Clipboard copy state
  const [copiedSelector, setCopiedSelector] = useState(false);
  const [copiedBefore, setCopiedBefore] = useState(false);
  const [copiedAfter, setCopiedAfter] = useState(false);
  const [copiedFramework, setCopiedFramework] = useState(false);

  // Expandable sections
  const [showSnippet, setShowSnippet] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showFix, setShowFix] = useState(true); // Open by default for immediate utility
  const [showFurther, setShowFurther] = useState(false);

  // "Still confused?" interactive sub-tabs
  const [furtherTab, setFurtherTab] = useState<'simpler' | 'alternative' | 'framework'>('simpler');
  const [frameworkTab, setFrameworkTab] = useState<'react' | 'vue' | 'tailwind'>('react');

  function copyText(text: string, setCopiedState: (val: boolean) => void) {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  }

  // Visual severity accent colors
  const severityColors = {
    critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.35)', bar: '#ef4444' },
    high: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)', bar: '#f59e0b' },
    medium: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', bar: '#38bdf8' },
    low: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.35)', bar: '#94a3b8' },
  }[finding.severity];

  const codeExample = finding.codeExample;
  const further = finding.furtherGuidance;
  const stepByStep = finding.stepByStepFix || [finding.suggestedFix];

  // Framework code snippet resolution
  const frameworkCode =
    further?.frameworkGuidance?.[frameworkTab] ||
    (codeExample?.after ? `<!-- ${frameworkTab.toUpperCase()} adaptation -->\n${codeExample.after}` : '');

  return (
    <article
      className="glass-panel"
      aria-labelledby={`finding-title-${finding.fingerprint}`}
      style={{
        borderRadius: '0.875rem',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        borderLeft: `4px solid ${severityColors.bar}`,
        transition: 'border 0.2s ease',
      }}
    >
      {/* ── Top Badges Row ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Severity Badge */}
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              background: severityColors.bg,
              color: severityColors.text,
              border: `1px solid ${severityColors.border}`,
            }}
          >
            {finding.severity}
          </span>

          {/* Category Badge */}
          <span
            style={{
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
            }}
          >
            {finding.category === 'layout' && <Smartphone size={11} aria-hidden="true" />}
            {finding.category === 'security' && <ShieldAlert size={11} aria-hidden="true" />}
            {finding.category === 'seo' && <BookOpen size={11} aria-hidden="true" />}
            {finding.category === 'performance' && <Wrench size={11} aria-hidden="true" />}
            {finding.category === 'accessibility' && <AlertCircle size={11} aria-hidden="true" />}
            {finding.category}
          </span>

          {/* Rule ID Tag */}
          <span
            style={{
              fontSize: '0.725rem',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#94a3b8',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '0.15rem 0.45rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            {finding.ruleId}
          </span>
        </div>

        {/* Status / Human Review & Doc Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {rescanStatus === 'persisting' && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '0.375rem',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              Persisting Defect
            </span>
          )}
          {rescanStatus === 'new' && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '0.375rem',
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#a855f7',
                border: '1px solid rgba(168, 85, 247, 0.25)',
              }}
            >
              Newly Introduced
            </span>
          )}
          {finding.requiresHumanReview && (
            <span
              title="Automated tools cannot evaluate subjective user intent; manual verification is advised"
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '0.375rem',
                background: 'rgba(168, 85, 247, 0.12)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Eye size={12} aria-hidden="true" /> Needs Human Review
            </span>
          )}
          {finding.helpUrl && (
            <a
              href={finding.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Official documentation for ${finding.ruleId} (opens in new tab)`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.08)',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                textDecoration: 'none',
              }}
            >
              <span>Docs</span>
              <ExternalLink size={10} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* ── Title / Primary Message ── */}
      <h3
        id={`finding-title-${finding.fingerprint}`}
        style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          color: '#f8fafc',
          marginBottom: '0.5rem',
          lineHeight: 1.4,
        }}
      >
        {finding.message}
      </h3>

      {/* ── Plain English "What is wrong" ── */}
      {finding.whatIsWrong && (
        <p
          style={{
            fontSize: '0.85rem',
            color: '#cbd5e1',
            lineHeight: 1.5,
            marginBottom: '0.75rem',
          }}
        >
          <strong style={{ color: '#f1f5f9' }}>What's wrong: </strong>
          {finding.whatIsWrong}
        </p>
      )}

      {/* ── Affected Element Selector Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '0.375rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '0.75rem',
          fontSize: '0.775rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Selector:</span>
          <code style={{ color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {finding.element}
          </code>
        </div>
        <button
          type="button"
          onClick={() => copyText(finding.element, setCopiedSelector)}
          title="Copy selector"
          aria-label="Copy element selector"
          style={{
            background: 'transparent',
            border: 'none',
            color: copiedSelector ? '#10b981' : '#94a3b8',
            cursor: 'pointer',
            padding: '0.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.7rem',
          }}
        >
          {copiedSelector ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          <span>{copiedSelector ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* ── Collapsible HTML Snippet (if available) ── */}
      {finding.snippet && (
        <div style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowSnippet(!showSnippet)}
            aria-expanded={showSnippet}
            aria-label={showSnippet ? 'Hide HTML snippet' : 'View HTML snippet'}
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
            {showSnippet ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
            <span>{showSnippet ? 'Hide HTML snippet' : 'View HTML snippet'}</span>
          </button>
          {showSnippet && (
            <pre
              style={{
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
              }}
            >
              <code>{finding.snippet}</code>
            </pre>
          )}
        </div>
      )}

      {/* ── Concrete Measured Evidence Box ── */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '0.75rem 0.875rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: '#94a3b8',
            fontSize: '0.725rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '0.25rem',
          }}
        >
          <ShieldAlert size={12} color="#f59e0b" aria-hidden="true" /> Measured Evidence
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#cbd5e1', lineHeight: 1.5 }}>
          {finding.evidence}
        </p>
      </div>

      {/* ── Interactive Assistant Action Bar ── */}
      <div
        role="tablist"
        aria-label="Guidance options"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          paddingBottom: '0.75rem',
        }}
      >
        {/* Toggle 1: Explain this issue */}
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          aria-expanded={showExplanation}
          aria-label="Explain this issue in detail"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            color: showExplanation ? '#ffffff' : '#94a3b8',
            background: showExplanation ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: showExplanation ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <BookOpen size={14} aria-hidden="true" />
          <span>Explain this issue</span>
          {showExplanation ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
        </button>

        {/* Toggle 2: Show me how to fix it */}
        <button
          type="button"
          onClick={() => setShowFix(!showFix)}
          aria-expanded={showFix}
          aria-label="Show step-by-step fix and code examples"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            color: showFix ? '#ffffff' : '#38bdf8',
            background: showFix ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
          }}
        >
          <Wrench size={14} aria-hidden="true" />
          <span>Show me how to fix it</span>
          {showFix ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
        </button>

        {/* Toggle 3: Still confused? Explain further */}
        <button
          type="button"
          onClick={() => setShowFurther(!showFurther)}
          aria-expanded={showFurther}
          aria-label="Get simpler explanations, alternative examples, or framework code"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            color: showFurther ? '#ffffff' : '#c084fc',
            background: showFurther ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.08)',
            border: showFurther ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(168, 85, 247, 0.2)',
          }}
        >
          <HelpCircle size={14} aria-hidden="true" />
          <span>Still confused? Explain further</span>
          {showFurther ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
        </button>
      </div>

      {/* ── EXPANDED PANEL 1: "Explain this issue" ── */}
      {showExplanation && (
        <section
          aria-label="Why this issue matters and accessibility explanation"
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            padding: '1rem',
            borderRadius: '0.625rem',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
            <BookOpen size={16} aria-hidden="true" />
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
              Why this issue matters
            </h4>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '0.75rem' }}>
            {finding.whyItMatters || 'Accessible design ensures that all users, regardless of disability or device, can understand and navigate your website.'}
          </p>

          {/* Automated vs Human Review Distinction */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '0.625rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <Info size={14} color="#94a3b8" style={{ marginTop: '0.125rem', flexShrink: 0 }} aria-hidden="true" />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
              <strong style={{ color: '#cbd5e1' }}>Automated Verification Boundary: </strong>
              {finding.requiresHumanReview
                ? 'This rule was flagged by automated checks, but determining the correct fix requires human review (e.g., verifying whether an image conveys unique information or checking contrast over background gradients).'
                : 'This rule is an objective syntactic violation detected with high confidence by automated inspection.'}
            </p>
          </div>
        </section>
      )}

      {/* ── EXPANDED PANEL 2: "Show me how to fix it" ── */}
      {showFix && (
        <section
          aria-label="Step-by-step fix and code examples"
          style={{
            background: 'rgba(56, 189, 248, 0.03)',
            padding: '1rem',
            borderRadius: '0.625rem',
            border: '1px solid rgba(56, 189, 248, 0.18)',
            marginBottom: '1rem',
          }}
        >
          {/* Step-by-step Checklist */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
              <Wrench size={15} aria-hidden="true" />
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Step-by-Step Fix
              </h4>
            </div>
            <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
              {stepByStep.map((step, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '0.8125rem',
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                    marginBottom: '0.375rem',
                  }}
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Contextual Guardrails (Color Contrast & Decorative Alt) */}
          {finding.ruleId === 'color-contrast' && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '0.5rem',
                padding: '0.625rem 0.75rem',
                marginBottom: '1rem',
                fontSize: '0.775rem',
                color: '#fde68a',
                lineHeight: 1.5,
              }}
            >
              <strong>Design Notice: </strong>
              The correct colors depend on your design palette. Adjust values using a contrast checker to meet the 4.5:1 ratio for normal text. Never blindly copy arbitrary colors without visual brand verification.
            </div>
          )}

          {finding.ruleId === 'image-alt' && (
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '0.5rem',
                padding: '0.625rem 0.75rem',
                marginBottom: '1rem',
                fontSize: '0.775rem',
                color: '#bae6fd',
                lineHeight: 1.5,
              }}
            >
              <strong>Image Purpose Notice: </strong>
              If the image conveys information, describe it concisely in <code>alt="..."</code>. If the image is purely visual decoration with no unique meaning, use <code>alt="" role="presentation"</code> so screen readers ignore it.
            </div>
          )}

          {/* Before & After Code Example */}
          {codeExample && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Code Comparison
              </div>

              {/* Before Code Box */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '0.625rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>
                    Before (Inaccessible)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(codeExample.before, setCopiedBefore)}
                    aria-label="Copy inaccessible code example"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedBefore ? '#10b981' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {copiedBefore ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                    <span>{copiedBefore ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre style={{ margin: 0, fontSize: '0.75rem', color: '#fecaca', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  <code>{codeExample.before}</code>
                </pre>
              </div>

              {/* After Code Box */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
                    After (Recommended Fix)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(codeExample.after, setCopiedAfter)}
                    aria-label="Copy recommended fix code example"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedAfter ? '#10b981' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {copiedAfter ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                    <span>{copiedAfter ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre style={{ margin: 0, fontSize: '0.75rem', color: '#a7f3d0', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  <code>{codeExample.after}</code>
                </pre>
              </div>

              {/* Example Explanation Note */}
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                {codeExample.explanation}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── EXPANDED PANEL 3: "Still confused? Explain further" ── */}
      {showFurther && (
        <section
          aria-label="Extended explanations and framework guidance"
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            padding: '1rem',
            borderRadius: '0.625rem',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            marginBottom: '0.75rem',
          }}
        >
          {/* Sub-Tabs: Simpler | Alternative | Framework */}
          <div
            role="tablist"
            aria-label="Further explanation perspective"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              marginBottom: '0.875rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              paddingBottom: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={furtherTab === 'simpler'}
              onClick={() => setFurtherTab('simpler')}
              style={{
                background: furtherTab === 'simpler' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                border: furtherTab === 'simpler' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                color: furtherTab === 'simpler' ? '#ffffff' : '#94a3b8',
                padding: '0.25rem 0.625rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Simpler Explanation
            </button>

            {further?.alternativeExample && (
              <button
                type="button"
                role="tab"
                aria-selected={furtherTab === 'alternative'}
                onClick={() => setFurtherTab('alternative')}
                style={{
                  background: furtherTab === 'alternative' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                  border: furtherTab === 'alternative' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                  color: furtherTab === 'alternative' ? '#ffffff' : '#94a3b8',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Another Example
              </button>
            )}

            <button
              type="button"
              role="tab"
              aria-selected={furtherTab === 'framework'}
              onClick={() => setFurtherTab('framework')}
              style={{
                background: furtherTab === 'framework' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                border: furtherTab === 'framework' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                color: furtherTab === 'framework' ? '#ffffff' : '#94a3b8',
                padding: '0.25rem 0.625rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Code2 size={13} aria-hidden="true" />
              <span>Framework Code</span>
            </button>
          </div>

          {/* Tab 1: Simpler Explanation */}
          {furtherTab === 'simpler' && (
            <div>
              <p style={{ fontSize: '0.825rem', color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>
                {further?.simplerExplanation ||
                  'Imagine interacting with this website using only sound or a keyboard. Accessible code adds digital clues so every visitor receives the same clear, functional experience.'}
              </p>
            </div>
          )}

          {/* Tab 2: Alternative Example */}
          {furtherTab === 'alternative' && further?.alternativeExample && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                Alternative approach using different attributes or semantic HTML:
              </div>
              <pre
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '0.625rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '0.75rem',
                  color: '#e2e8f0',
                  overflowX: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                <code>{further.alternativeExample}</code>
              </pre>
            </div>
          )}

          {/* Tab 3: Framework Code (React / Vue / Tailwind) */}
          {furtherTab === 'framework' && (
            <div>
              {/* Framework Selector Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                {(['react', 'vue', 'tailwind'] as const).map((fw) => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => setFrameworkTab(fw)}
                    aria-label={`Show ${fw} code example`}
                    style={{
                      background: frameworkTab === fw ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: frameworkTab === fw ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                      color: frameworkTab === fw ? '#38bdf8' : '#94a3b8',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {fw === 'tailwind' ? 'Tailwind CSS' : fw}
                  </button>
                ))}
              </div>

              {/* Code Box with Copy */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    {frameworkTab.toUpperCase()} Snippet
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(frameworkCode, setCopiedFramework)}
                    aria-label={`Copy ${frameworkTab} code snippet`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedFramework ? '#10b981' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {copiedFramework ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                    <span>{copiedFramework ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre style={{ margin: 0, fontSize: '0.75rem', color: '#e2e8f0', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  <code>{frameworkCode}</code>
                </pre>
              </div>
            </div>
          )}
        </section>
      )}
    </article>
  );
}
