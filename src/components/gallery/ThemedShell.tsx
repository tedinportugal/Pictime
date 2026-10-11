export function ThemedShell({ vars, children }: { vars: Record<string, string>; children: React.ReactNode }) {
  return (
    <div style={{ ...(vars as React.CSSProperties), background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', minHeight: '100svh' }}>
      {children}
    </div>
  );
}
