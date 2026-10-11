import { describe, expect, it } from 'vitest';
import { themeFromPreset } from '@/lib/theme/presets';
import { themeSchema } from '@/lib/theme/schema';
import { themeToCssVars } from '@/lib/theme/css';

describe('tema', () => {
  it('converte um preset em variáveis CSS', () => {
    const vars = themeToCssVars(themeFromPreset('noite'));
    expect(vars['--bg']).toBe('#141414');
    expect(vars['--font-heading']).toBe('var(--font-cormorant)');
    expect(vars['--font-body']).toBe('var(--font-inter)');
  });
  it('devolve cópias independentes do preset', () => {
    const a = themeFromPreset('marfim');
    a.colors.background = '#000000';
    expect(themeFromPreset('marfim').colors.background).toBe('#F6F1E9');
  });
  it('rejeita cores inválidas', () => {
    const t = themeFromPreset('oliva');
    expect(themeSchema.safeParse(t).success).toBe(true);
    expect(themeSchema.safeParse({ ...t, colors: { ...t.colors, text: 'red; x:y' } }).success).toBe(false);
  });
});
