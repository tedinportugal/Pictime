import type { Metadata } from 'next';
import { fontVariables } from './fonts';
import { BRAND_NAME } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = { title: BRAND_NAME };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
