import { CheckCircle2, Filter } from 'lucide-react';

interface EmptyStateProps {
  isFiltered: boolean;
  onResetFilter?: () => void;
}

export function EmptyState({ isFiltered, onResetFilter }: EmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="glass-panel" style={{ borderRadius: '1rem', padding: '3rem 1.5rem', textAlign: 'center', width: '100%', maxWidth: '1000px' }}>
        <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', marginBottom: '1rem' }}>
          <Filter size={24} />
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.375rem' }}>
          No findings match the selected filters
        </h3>
        <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
          Try clearing the severity or search filters to view other findings.
        </p>
        {onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ borderRadius: '1rem', padding: '3.5rem 1.5rem', textAlign: 'center', width: '100%', maxWidth: '1000px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
      <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', marginBottom: '1.25rem', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}>
        <CheckCircle2 size={36} />
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
        Zero Issues Detected!
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#cbd5e1', maxWidth: '550px', margin: '0 auto 1rem', lineHeight: 1.6 }}>
        The audited webpage adheres to all 5 objective accessibility categories (buttons, labels, images, contrast, headings) and contains no mobile horizontal overflow at 375px.
      </p>
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
        Note: Subjective criteria (e.g. keyboard navigation, screen reader narrative) still recommend human review.
      </div>
    </div>
  );
}
