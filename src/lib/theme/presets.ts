import type { ThemePresetId, ThemeSettings } from './types';

export const PRESETS: Record<ThemePresetId, ThemeSettings> = {
  marfim: {
    preset: 'marfim', headingFont: 'cormorant', bodyFont: 'inter', logoUrl: null,
    colors: { background: '#F6F1E9', surface: '#EDE6DA', text: '#2B2A26', muted: '#7A746A', accent: '#6B6A4F' },
  },
  oliva: {
    preset: 'oliva', headingFont: 'playfair', bodyFont: 'jost', logoUrl: null,
    colors: { background: '#EEEBE3', surface: '#E2DED2', text: '#2F2E24', muted: '#77735F', accent: '#5B5A3F' },
  },
  noite: {
    preset: 'noite', headingFont: 'cormorant', bodyFont: 'inter', logoUrl: null,
    colors: { background: '#141414', surface: '#1F1E1C', text: '#EFEAE2', muted: '#A39D92', accent: '#C9B99A' },
  },
};

export function themeFromPreset(id: ThemePresetId): ThemeSettings {
  return structuredClone(PRESETS[id]);
}
