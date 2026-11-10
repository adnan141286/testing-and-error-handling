import React from 'react';

export interface BtnProps {
  onClick: () => void | Promise<void>;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  'aria-label'?: string;
}

const BG: Record<string, string> = {
  primary: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  secondary: '#1b1233',
  danger: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
};

const BORDERS: Record<string, string> = {
  primary: '1px solid #a78bfa',
  secondary: '1px solid #3d266e',
  danger: '1px solid #f87171',
};

/**
 * Accessible Cyber-Violet terminal button with loading and disabled states.
 * Guarantees minimum 44px height for accessibility standards.
 *
 * @param props - Button properties
 * @returns React element
 */
export function Btn({
  onClick,
  label,
  loading = false,
  disabled = false,
  variant = 'primary',
  'aria-label': ariaLabel,
}: BtnProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-busy={loading}
      disabled={isDisabled}
      onClick={(): void => {
        void onClick();
      }}
      style={{
        minHeight: 44,
        padding: '0 18px',
        background: isDisabled ? '#241b3d' : BG[variant] ?? BG.primary,
        color: isDisabled ? '#64748b' : '#ffffff',
        border: isDisabled ? '1px solid #2d224d' : BORDERS[variant] ?? '1px solid #a78bfa',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: '0.02em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow:
          !isDisabled && variant === 'primary' ? '0 0 15px rgba(139, 92, 246, 0.35)' : 'none',
        transition: 'all 0.15s ease-in-out',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
      onFocus={(e): void => {
        e.currentTarget.style.outline = '2px solid #c084fc';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e): void => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      {loading ? '⟳ Processing…' : label}
    </button>
  );
}
