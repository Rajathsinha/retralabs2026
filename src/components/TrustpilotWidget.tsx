import { useEffect, useRef } from 'react';

const BUSINESS_UNIT_ID = '6979766a0f4152620862a8e6';
const TRUSTPILOT_URL   = 'https://www.trustpilot.com/review/retralabs.in';
const SCRIPT_SRC       = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';

/**
 * Trustpilot TrustBox template IDs.
 *
 * microStar   — just 5 stars                ~20 px  (smallest)
 * microCombo  — stars + Trustpilot wordmark ~20 px
 * microReview — stars + review count        ~24 px
 * mini        — score + stars + count      ~150 px
 * carousel    — scrollable review cards    ~240 px  (homepage section)
 */
export const TP_TEMPLATES = {
  microStar:   '5419b637fa0340045cd0c936',
  microCombo:  '5419b732fbfb950b10de65e5',
  microReview: '5419b6ffb0d04a076446a9af',
  mini:        '53aa8807dec7e10d38f59f32',
  carousel:    '53aa8912dec7e10d38f59f32',
} as const;

type TemplateKey = keyof typeof TP_TEMPLATES;

interface TrustpilotWidgetProps {
  template?:  TemplateKey;
  height?:    string;
  width?:     string;
  theme?:     'dark' | 'light';
  className?: string;
}

/** Initialises a single TrustBox element, waiting for the TP script if needed. */
function initWidget(el: HTMLDivElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tp = (window as any).Trustpilot;
  if (tp) {
    tp.loadFromElement(el, true);
    return;
  }

  // Script not ready yet — attach a one-time load listener to the existing tag
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${SCRIPT_SRC}"], script[src="https:${SCRIPT_SRC}"], script[src="http:${SCRIPT_SRC}"]`
  );
  if (existing) {
    existing.addEventListener('load', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Trustpilot?.loadFromElement(el, true);
    }, { once: true });
  }
}

export default function TrustpilotWidget({
  template  = 'microCombo',
  height    = '24px',
  width     = '160px',
  theme     = 'dark',
  className = '',
}: TrustpilotWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) initWidget(ref.current);
  }, []);

  return (
    <div
      ref={ref}
      className={`trustpilot-widget ${className}`}
      data-locale="en-US"
      data-template-id={TP_TEMPLATES[template]}
      data-businessunit-id={BUSINESS_UNIT_ID}
      data-style-height={height}
      data-style-width={width}
      data-theme={theme}
    >
      <a href={TRUSTPILOT_URL} target="_blank" rel="noopener noreferrer">
        Trustpilot
      </a>
    </div>
  );
}
