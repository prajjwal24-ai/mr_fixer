import { RefreshCw, CheckCircle2, AlertTriangle, PlusCircle } from 'lucide-react';
import type { RescanVerification } from '../types.ts';

interface RescanBannerProps {
  onRescan: () => void;
  isRescanning: boolean;
  verification: RescanVerification | null;
}

export function RescanBanner({ onRescan, isRescanning, verification }: RescanBannerProps) {
  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '1000px', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h3 style={{ fontSize: '0.975rem', fontWeight: 600, color: '#f8fafc' }}>
            Verification Re-scan
          </h3>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '0.125rem 0.5rem', borderRadius: '9999px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            Rule #7 Compliant
          </span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
          Fixed issues on your webpage? Run a fresh scan to empirically verify which findings are resolved.
        </p>

        {verification && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.625rem', fontSize: '0.775rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
              <CheckCircle2 size={13} /> {verification.resolvedFingerprints.length} Resolved
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}>
              <AlertTriangle size={13} /> {verification.persistingFingerprints.length} Persisting
            </span>
            {verification.newFingerprints.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 600 }}>
                <PlusCircle size={13} /> {verification.newFingerprints.length} Newly Introduced
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRescan}
        disabled={isRescanning}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: isRescanning ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          color: '#38bdf8',
          padding: '0.625rem 1.25rem',
          borderRadius: '0.625rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: isRescanning ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        <RefreshCw size={15} className={isRescanning ? 'beacon-pulse' : ''} />
        <span>{isRescanning ? 'Re-scanning...' : 'Re-scan to Verify'}</span>
      </button>
    </div>
  );
}
