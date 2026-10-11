import type { BodyFont, HeadingFont, ThemeSettings } from './types';

const HEADING: Record<HeadingFont, string> = {
  cormorant: 'var(--font-cormorant)',
  playfair: 'var(--font-playfair)',
  bodoni: 'var(--font-bodoni)',
};
const BODY: Record<BodyFont, string> = { inter: 'var(--font-inter)', jost: 'var(--font-jost)' };

export function themeToCssVars(t: ThemeSettings): Record<string, string> {
  return {
    '--bg': t.colors.background,
    '--surface': t.colors.surface,
    '--text': t.colors.text,
    '--muted': t.colors.muted,
    '--accent': t.colors.accent,
    '--font-heading': HEADING[t.headingFont],
    '--font-body': BODY[t.bodyFont],
  };
}
