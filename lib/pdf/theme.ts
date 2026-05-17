/**
 * Design tokens for the audit PDF.
 * Inspired by editorial layouts (Stripe annual report, Linear changelog, McKinsey one-pagers).
 */
export const theme = {
  colors: {
    ink: '#0A0A0A',
    body: '#262626',
    muted: '#737373',
    rule: '#E5E5E5',
    paper: '#FFFFFF',
    panel: '#FAFAF9',
    accent: '#FF5C1A',          // SimplifIQ default; overridable per-lead
    accentSoft: '#FFF0E8',
  },
  spacing: {
    pagePadX: 56,               // ~ 0.78 inch
    pagePadY: 64,
    sectionGap: 28,
    blockGap: 16,
    tightGap: 8,
  },
  type: {
    // @react-pdf/renderer uses Helvetica family by default — clean and Helvetica-feeling.
    // No custom fonts → fewer cold-start issues and zero font-fetch latency.
    cover: 36,
    h1: 22,
    h2: 15,
    h3: 12,
    body: 10.5,
    small: 9,
    micro: 8,
    lineHeight: 1.55,
  },
} as const;

type ColorToken = keyof typeof theme.colors;

export type Theme = Omit<typeof theme, 'colors'> & {
  colors: Record<ColorToken, string>;
};

/**
 * Build a theme with a custom accent color from enrichment branding.
 * Falls back to default accent if input is missing or invalid.
 */
export function themeWithAccent(accent: string | null | undefined): Theme {
  if (!accent || !/^#?[0-9a-fA-F]{3,8}$/.test(accent.replace('#', ''))) {
    return theme;
  }
  const hex = accent.startsWith('#') ? accent : `#${accent}`;
  return {
    ...theme,
    colors: { ...theme.colors, accent: hex, accentSoft: lighten(hex, 0.92) },
  };
}

function lighten(hex: string, amount: number): string {
  // Returns a very-light tint of the hex color. amount = 0.92 means 92% toward white.
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
