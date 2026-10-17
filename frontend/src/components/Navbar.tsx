import { ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import type { HealthData } from '../types.ts';

interface NavbarProps {
  health: HealthData | null;
  isBackendOffline: boolean;
}

export function Navbar({ health, isBackendOffline }: NavbarProps) {
  return (
    <nav style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
          padding: '0.625rem',
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(56, 189, 248, 0.35)',
        }}>
          <ShieldCheck size={26} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc' }}>
              Mr. Fixer
            </h1>
            <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              MVP ENGINE
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            Deterministic Accessibility & Layout Auditing
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.875rem',
          borderRadius: '9999px',
          fontSize: '0.775rem',
          fontWeight: 500,
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {isBackendOffline ? (
            <>
              <WifiOff size={14} color="#ef4444" />
              <span style={{ color: '#ef4444' }}>Backend Offline</span>
            </>
          ) : (
            <>
              <Wifi size={14} color="#10b981" />
              <span style={{ color: '#10b981' }}>
                Engine Online{health?.environment ? ` (${health.environment})` : ''}
              </span>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
