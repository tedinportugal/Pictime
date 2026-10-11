import { z } from 'zod';
import { BODY_FONTS, HEADING_FONTS, PRESET_IDS } from './types';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const themeSchema = z.object({
  preset: z.enum(PRESET_IDS),
  headingFont: z.enum(HEADING_FONTS),
  bodyFont: z.enum(BODY_FONTS),
  colors: z.object({ background: hex, surface: hex, text: hex, muted: hex, accent: hex }),
  logoUrl: z.string().max(2000).nullable(),
});
