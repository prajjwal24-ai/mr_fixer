import { useState, type FormEvent } from 'react';
import { Search, Loader2, Globe, Sparkles } from 'lucide-react';

interface UrlBarProps {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (urlToScan: string) => void;
  isLoading: boolean;
}

export function UrlBar({ url, setUrl, onSubmit, isLoading }: UrlBarProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setValidationError('Please enter a website URL.');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setValidationError('Only http:// and https:// URLs are permitted.');
        return;
      }
    } catch {
      setValidationError('Invalid URL format. Please include http:// or https:// (e.g. https://example.com).');
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  }

  function handleQuickSelect(sampleUrl: string) {
    setUrl(sampleUrl);
    setValidationError(null);
    onSubmit(sampleUrl);
  }

  return (
    <div style={{ width: '100%', maxWidth: '1000px', marginBottom: '2rem' }}>
      <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.9)',
          border: validationError ? '1px solid #ef4444' : '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '1rem',
          padding: '0.5rem 0.625rem 0.5rem 1.25rem',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.2s ease',
        }}>
          <Globe size={20} color="#38bdf8" style={{ marginRight: '0.875rem', flexShrink: 0 }} />

          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Enter public webpage URL (e.g. https://example.com)..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.975rem',
              fontFamily: 'Inter, sans-serif',
            }}
          />

          <button
            type="submit"
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: isLoading ? 'rgba(56, 189, 248, 0.3)' : 'linear-gradient(135deg, #0284c7, #38bdf8)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.625rem',
              padding: '0.625rem 1.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isLoading ? 'none' : '0 0 15px rgba(56, 189, 248, 0.3)',
              flexShrink: 0,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="beacon-pulse" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Start Audit</span>
              </>
            )}
          </button>
        </div>

        {validationError && (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', marginLeft: '0.5rem' }}>
            {validationError}
          </div>
        )}
      </form>

      {/* Sample presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.775rem', color: '#64748b' }}>
        <Sparkles size={13} color="#94a3b8" />
        <span>Try a sample:</span>
        <button
          type="button"
          onClick={() => handleQuickSelect('https://example.com')}
          disabled={isLoading}
          style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          example.com
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect('https://news.ycombinator.com')}
          disabled={isLoading}
          style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          news.ycombinator.com
        </button>
      </div>
    </div>
  );
}
