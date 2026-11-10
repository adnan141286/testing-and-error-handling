import React, { useState } from 'react';
import { Btn } from '../Btn';
import { HonestBadge } from '../HonestBadge';
import { cardStyle, titleStyle } from './tab5Styles';

interface TouchTarget {
  tag: string;
  text: string;
  height: number;
}

interface FocusElement {
  tag: string;
  text: string;
  tabIndex: number;
}

/**
 * Touch target bounds and keyboard navigation inspector.
 */
export function TouchAndKeyboardSection(): React.JSX.Element {
  const [touchTargets, setTouchTargets] = useState<TouchTarget[] | null>(null);
  const [focusables, setFocusables] = useState<FocusElement[] | null>(null);

  const checkTouchTargets = (): void => {
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"], input, select'));
    const small: TouchTarget[] = btns
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el as HTMLElement).innerText?.slice(0, 30) || (el as HTMLInputElement).value || '',
        height: Math.round(el.getBoundingClientRect().height),
      }))
      .filter((t) => t.height < 44);
    setTouchTargets(small);
  };

  const testKeyboardNav = (): void => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const list: FocusElement[] = nodes.map((n) => ({
      tag: n.tagName.toLowerCase(),
      text: (n.innerText || (n as HTMLInputElement).value || n.getAttribute('aria-label') || '').slice(0, 30),
      tabIndex: n.tabIndex,
    }));
    setFocusables(list);
  };

  return (
    <>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={titleStyle}>44PX MINIMUM TOUCH-TARGET VERIFICATION</div>
          <HonestBadge type="INTERNAL" source="DOM Inspector" />
        </div>
        <Btn onClick={checkTouchTargets} label="Audit Interactive Touch Bounds" variant="secondary" />
        {touchTargets !== null && (
          <div style={{ marginTop: 12 }}>
            {touchTargets.length === 0 ? (
              <p style={{ color: '#34d399', fontWeight: 800, margin: 0 }}>
                ✓ All interactive controls satisfy the 44px touch guideline.
              </p>
            ) : (
              touchTargets.map((t, idx) => (
                <div key={idx} style={{ color: '#f87171', fontSize: 12 }}>
                  {t.tag} &quot;{t.text}&quot; height: {t.height}px (requires &gt;= 44px)
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={titleStyle}>KEYBOARD NAVIGATION & TAB-ORDER INSPECTION</div>
          <HonestBadge type="INTERNAL" source="DOM Traversal" />
        </div>
        <Btn onClick={testKeyboardNav} label="Test Keyboard Navigation" variant="secondary" />
        {focusables !== null && (
          <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto' }}>
            <div style={{ color: '#34d399', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              {focusables.length} Focusable Elements Found in DOM Tab Order:
            </div>
            {focusables.map((f, i) => (
              <div key={i} style={{ color: '#c4b5fd', fontSize: 11, padding: '2px 0' }}>
                #{i + 1} &lt;{f.tag}&gt; &quot;{f.text}&quot; (tabindex: {f.tabIndex})
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

