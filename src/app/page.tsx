import { BRAND_NAME } from '@/lib/brand';

export default function Home() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontWeight: 300, fontSize: '3rem' }}>{BRAND_NAME}</h1>
    </main>
  );
}
