export function DashboardPage() {
  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Dashboard</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>
        Overview of your support tickets
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Open',     value: '—', color: 'var(--color-brand-400)' },
          { label: 'Resolved', value: '—', color: 'var(--color-success)' },
          { label: 'Closed',   value: '—', color: 'var(--color-muted)' },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              {stat.label}
            </p>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
