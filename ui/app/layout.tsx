export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', margin: 0 }}>
        <header style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <strong>KMV Console</strong>
          <nav style={{ marginTop: 8 }}>
            <a href="/" style={{ marginRight: 12 }}>Home</a>
            <a href="/refine" style={{ marginRight: 12 }}>Refinement</a>
            <a href="/proposal">Proposal</a>
          </nav>
        </header>
        <main style={{ padding: 16 }}>{children}</main>
      </body>
    </html>
  );
}
