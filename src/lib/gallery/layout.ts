export interface LayoutItem {
  id: string;
  width: number;
  height: number;
}

export interface Row {
  height: number;
  items: LayoutItem[];
}

function place(items: LayoutItem[], height: number): Row {
  return { height, items: items.map((i) => ({ id: i.id, width: (i.width / i.height) * height, height })) };
}

/** Grelha justificada: cada linha ocupa a largura toda, sem cortar fotos. */
export function justifiedRows(items: LayoutItem[], containerWidth: number, targetHeight: number, gap: number): Row[] {
  const rows: Row[] = [];
  let current: LayoutItem[] = [];
  let aspectSum = 0;
  for (const item of items) {
    current.push(item);
    aspectSum += item.width / item.height;
    if (aspectSum * targetHeight + gap * (current.length - 1) >= containerWidth) {
      rows.push(place(current, (containerWidth - gap * (current.length - 1)) / aspectSum));
      current = [];
      aspectSum = 0;
    }
  }
  if (current.length) rows.push(place(current, targetHeight));
  return rows;
}

export function groupByChapter<T extends { chapterId: string | null }>(
  photos: T[],
  chapters: { id: string; name: string }[],
): { id: string | null; name: string | null; photos: T[] }[] {
  const known = new Set(chapters.map((c) => c.id));
  const sections = [
    { id: null, name: null, photos: photos.filter((p) => !p.chapterId || !known.has(p.chapterId)) },
    ...chapters.map((c) => ({ id: c.id, name: c.name, photos: photos.filter((p) => p.chapterId === c.id) })),
  ];
  return sections.filter((s) => s.photos.length > 0);
}
