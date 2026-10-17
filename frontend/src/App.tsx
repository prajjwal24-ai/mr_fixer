import { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { UrlBar } from './components/UrlBar.tsx';
import { AuditSummaryCards } from './components/AuditSummaryCards.tsx';
import { RescanBanner } from './components/RescanBanner.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { FindingCard } from './components/FindingCard.tsx';
import { EmptyState } from './components/EmptyState.tsx';
import { fetchHealth, startAudit, startRescan, extractErrorMessage } from './api.ts';
import type {
  AuditReport,
  RescanVerification,
  FindingSeverity,
  FindingCategory,
  HealthData,
} from './types.ts';
import { AlertCircle, Loader2, RefreshCw, Sparkles, WifiOff } from 'lucide-react';

export function App() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [rescanVerification, setRescanVerification] = useState<RescanVerification | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<FindingSeverity | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<FindingCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial health check
  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setHealth(data);
        setIsBackendOffline(false);
      })
      .catch(() => {
        setIsBackendOffline(true);
      });
  }, []);

  async function handleAudit(targetUrl: string) {
    if (isLoading || isRescanning) return;

    setIsLoading(true);
    setErrorMessage(null);
    setRescanVerification(null);

    try {
      const result = await startAudit(targetUrl);
      setReport(result);
      setUrl(result.url);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRescan() {
    if (!report || isRescanning || isLoading) return;

    setIsRescanning(true);
    setErrorMessage(null);

    const previousFingerprints = report.findings.map((f) => f.fingerprint);

    try {
      const rescanResult = await startRescan(report.url, previousFingerprints);
      // Update report with the fresh scan and store verification diff
      setReport(rescanResult.report);
      setRescanVerification(rescanResult.verification);
    } catch (err) {
      // Preserve previous report on failure
      setErrorMessage(`Rescan failed: ${extractErrorMessage(err)}`);
    } finally {
      setIsRescanning(false);
    }
  }

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    if (!report) return [];

    return report.findings.filter((finding) => {
      // Severity filter
      if (selectedSeverity !== 'all' && finding.severity !== selectedSeverity) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && finding.category !== selectedCategory) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSelector = finding.element.toLowerCase().includes(query);
        const matchesMessage = finding.message.toLowerCase().includes(query);
        const matchesRule = finding.ruleId.toLowerCase().includes(query);
        const matchesEvidence = finding.evidence.toLowerCase().includes(query);
        return matchesSelector || matchesMessage || matchesRule || matchesEvidence;
      }
      return true;
    });
  }, [report, selectedSeverity, selectedCategory, searchQuery]);

  // Counts for filter tabs
  const filterCounts = useMemo(() => {
    if (!report) return { all: 0, critical: 0, high: 0, medium: 0, low: 0 };
    return {
      all: report.findings.length,
      critical: report.summary.critical,
      high: report.summary.high,
      medium: report.summary.medium,
      low: report.summary.low,
    };
  }, [report]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
      <Navbar health={health} isBackendOffline={isBackendOffline} />

      {/* ── Backend Offline — block everything below the nav ── */}
      {isBackendOffline && (
        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '1000px',
          borderRadius: '1rem',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', marginBottom: '1.25rem' }}>
            <WifiOff size={36} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
            Unable to Connect to Audit Engine
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            The backend service is not responding. Make sure it is running on port 3001, then click Retry.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              padding: '0.625rem 1.375rem',
              borderRadius: '0.625rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── Online dashboard ── */}
      {!isBackendOffline && (
        <>
          {/* URL Input Form */}
          <UrlBar
            url={url}
            setUrl={setUrl}
            onSubmit={handleAudit}
            isLoading={isLoading || isRescanning}
          />

          {/* Global Error Banner */}
          {errorMessage && (
            <div style={{
              width: '100%',
              maxWidth: '1000px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '0.875rem',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fca5a5', marginBottom: '0.2rem' }}>
                  Audit Execution Failed
                </h4>
                <p style={{ fontSize: '0.8125rem', color: '#fecaca', lineHeight: 1.5 }}>
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Initial Audit Loading Overlay */}
          {isLoading && (
            <div className="glass-panel-glow" style={{
              width: '100%',
              maxWidth: '1000px',
              borderRadius: '1rem',
              padding: '3rem 2rem',
              textAlign: 'center',
              marginBottom: '2rem',
            }}>
              <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', marginBottom: '1.25rem' }}>
                <Loader2 size={32} className="beacon-pulse" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Running Deterministic Audit...
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '500px', margin: '0 auto' }}>
                Loading webpage in isolated headless browser, executing axe-core WCAG checks, and evaluating mobile viewport layout.
              </p>
            </div>
          )}

          {/* Rescan Loading Overlay */}
          {isRescanning && (
            <div style={{
              width: '100%',
              maxWidth: '1000px',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '1.5rem',
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
            }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', flexShrink: 0 }}>
                <RefreshCw size={24} className="beacon-pulse" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  Re-scanning to Verify...
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                  Running a fresh audit and comparing fingerprints against the previous report.
                </p>
              </div>
            </div>
          )}

          {/* Initial Idle Guidance State (before any scan) */}
          {!report && !isLoading && !errorMessage && (
            <div className="glass-panel" style={{ width: '100%', maxWidth: '1000px', borderRadius: '1rem', padding: '2.5rem 1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#38bdf8' }}>
                <Sparkles size={18} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
                  How Mr. Fixer Works
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Mr. Fixer accepts any public website URL and inspects it using an automated browser engine. It detects objective defects across 5 core categories:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '0.625rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>Buttons &amp; Controls</h4>
                  <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Detects interactive buttons and controls without accessible names.</p>
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '0.625rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>Form Labels</h4>
                  <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Verifies inputs, selects, and textareas have accessible labels.</p>
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '0.625rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>Image Alt Attributes</h4>
                  <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Finds images missing alt text while respecting decorative images.</p>
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '0.625rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>Color Contrast</h4>
                  <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Measures foreground vs. background text contrast ratios.</p>
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '0.625rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>Heading Hierarchy</h4>
                  <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Flags skipped heading levels and missing top-level h1 tags.</p>
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '0.625rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>Mobile Layout Overflow</h4>
                  <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Evaluates horizontal scrollbar violations at 375px mobile width.</p>
                </div>
              </div>
            </div>
          )}

          {/* Active Audit Results View */}
          {report && (
            <>
              {/* Summary Cards */}
              <AuditSummaryCards report={report} rescanVerification={rescanVerification} />

              {/* Rescan Action Banner */}
              <RescanBanner
                onRescan={handleRescan}
                isRescanning={isRescanning}
                verification={rescanVerification}
              />

              {/* Filter Bar */}
              <FilterBar
                selectedSeverity={selectedSeverity}
                setSelectedSeverity={setSelectedSeverity}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                counts={filterCounts}
              />

              {/* Findings List */}
              <div style={{ width: '100%', maxWidth: '1000px' }}>
                {report.findings.length === 0 ? (
                  <EmptyState isFiltered={false} />
                ) : filteredFindings.length === 0 ? (
                  <EmptyState
                    isFiltered={true}
                    onResetFilter={() => {
                      setSelectedSeverity('all');
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                  />
                ) : (
                  filteredFindings.map((finding) => {
                    // Determine rescan status tag
                    let rescanStatus: 'persisting' | 'new' | null = null;
                    if (rescanVerification) {
                      if (rescanVerification.persistingFingerprints.includes(finding.fingerprint)) {
                        rescanStatus = 'persisting';
                      } else if (rescanVerification.newFingerprints.includes(finding.fingerprint)) {
                        rescanStatus = 'new';
                      }
                    }

                    return (
                      <FindingCard
                        key={finding.fingerprint}
                        finding={finding}
                        rescanStatus={rescanStatus}
                      />
                    );
                  })
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
export default App;

