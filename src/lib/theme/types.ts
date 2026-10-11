export const PRESET_IDS = ['marfim', 'oliva', 'noite'] as const;
export const HEADING_FONTS = ['cormorant', 'playfair', 'bodoni'] as const;
export const BODY_FONTS = ['inter', 'jost'] as const;

export type ThemePresetId = (typeof PRESET_IDS)[number];
export type HeadingFont = (typeof HEADING_FONTS)[number];
export type BodyFont = (typeof BODY_FONTS)[number];

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
}

export interface ThemeSettings {
  preset: ThemePresetId;
  headingFont: HeadingFont;
  bodyFont: BodyFont;
  colors: ThemeColors;
  logoUrl: string | null;
}
