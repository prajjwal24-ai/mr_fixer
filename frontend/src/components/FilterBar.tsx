import { Search } from 'lucide-react';
import type { FindingSeverity, FindingCategory } from '../types.ts';

interface FilterBarProps {
  selectedSeverity: FindingSeverity | 'all';
  setSelectedSeverity: (sev: FindingSeverity | 'all') => void;
  selectedCategory: FindingCategory | 'all';
  setSelectedCategory: (cat: FindingCategory | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  counts: {
    all: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function FilterBar({
  selectedSeverity,
  setSelectedSeverity,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  counts,
}: FilterBarProps) {
  const severities: Array<{ id: FindingSeverity | 'all'; label: string; count: number; color?: string }> = [
    { id: 'all', label: 'All Issues', count: counts.all },
    { id: 'critical', label: 'Critical', count: counts.critical, color: '#ef4444' },
    { id: 'high', label: 'High', count: counts.high, color: '#f59e0b' },
    { id: 'medium', label: 'Medium', count: counts.medium, color: '#38bdf8' },
    { id: 'low', label: 'Low', count: counts.low, color: '#94a3b8' },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1000px', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Severity Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.25rem', borderRadius: '0.625rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {severities.map((item) => {
            const isActive = selectedSeverity === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedSeverity(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.775rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{item.label}</span>
                <span style={{ fontSize: '0.7rem', padding: '0.05rem 0.35rem', borderRadius: '9999px', background: isActive ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)', color: item.color || '#f1f5f9' }}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.25rem', borderRadius: '0.625rem', border: '1px solid rgba(255, 255, 255, 0.06)', flexWrap: 'wrap' }}>
          {(['all', 'accessibility', 'layout', 'seo', 'security', 'performance'] as const).map((cat) => {
            const isActive = selectedCategory === cat;
            const labels: Record<string, string> = {
              all: 'All',
              accessibility: 'A11y',
              layout: 'Layout',
              seo: 'SEO',
              security: 'Security',
              performance: 'Perf',
            };
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.375rem 0.625rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.775rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '0.625rem', padding: '0.375rem 0.75rem', minWidth: '220px' }}>
          <Search size={14} color="#64748b" style={{ marginRight: '0.5rem' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by selector, text, rule..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.775rem',
              width: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
