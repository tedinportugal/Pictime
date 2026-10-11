import { describe, expect, it } from 'vitest';
import { groupByChapter, justifiedRows } from '@/lib/gallery/layout';

const item = (id: string, w: number, h: number) => ({ id, width: w, height: h });

describe('justifiedRows', () => {
  it('preenche a largura nas linhas completas sem cortar (mantém proporções)', () => {
    const items = [item('a', 3, 2), item('b', 2, 3), item('c', 3, 2), item('d', 3, 2), item('e', 1, 1)];
    const rows = justifiedRows(items, 1000, 300, 8);
    for (const row of rows.slice(0, -1)) {
      const total = row.items.reduce((s, i) => s + i.width, 0) + 8 * (row.items.length - 1);
      expect(Math.abs(total - 1000)).toBeLessThan(0.5);
    }
    for (const row of rows) for (const placed of row.items) {
      const original = items.find((i) => i.id === placed.id)!;
      expect(placed.width / placed.height).toBeCloseTo(original.width / original.height, 5);
    }
  });

  it('a última linha não é esticada', () => {
    const rows = justifiedRows([item('a', 3, 2), item('b', 3, 2), item('c', 3, 2), item('d', 1, 1)], 1000, 300, 8);
    expect(rows).toHaveLength(2);
    expect(rows.at(-1)!.items.map((i) => i.id)).toEqual(['d']);
    expect(rows.at(-1)!.height).toBe(300);
  });

  it('em ecrã estreito cabe tudo e mantém a ordem', () => {
    const items = Array.from({ length: 7 }, (_, i) => item(String(i), i % 2 ? 2 : 3, i % 2 ? 3 : 2));
    const rows = justifiedRows(items, 343, 180, 4);
    expect(rows.flatMap((r) => r.items.map((i) => i.id))).toEqual(items.map((i) => i.id));
    for (const row of rows) expect(row.items.reduce((s, i) => s + i.width, 0)).toBeLessThanOrEqual(343);
  });

  it('lista vazia dá zero linhas', () => {
    expect(justifiedRows([], 1000, 300, 8)).toEqual([]);
  });
});

describe('groupByChapter', () => {
  it('fotos sem capítulo primeiro, depois por ordem dos capítulos, sem secções vazias', () => {
    const photos = [
      { id: '1', chapterId: 'c2' },
      { id: '2', chapterId: null },
      { id: '3', chapterId: 'c1' },
      { id: '4', chapterId: 'apagado' },
    ];
    const chapters = [{ id: 'c1', name: 'Cerimónia' }, { id: 'c2', name: 'Festa' }, { id: 'c3', name: 'Vazio' }];
    expect(groupByChapter(photos, chapters).map((s) => [s.name, s.photos.map((p) => p.id)])).toEqual([
      [null, ['2', '4']],
      ['Cerimónia', ['3']],
      ['Festa', ['1']],
    ]);
  });
});
