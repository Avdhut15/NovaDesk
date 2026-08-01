export function DashboardPage() {
  const stats = [
    { label: 'Open',     value: '—', color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-100' },
    { label: 'Resolved', value: '—', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'Closed',   value: '—', color: 'text-gray-500',  bg: 'bg-gray-50',  border: 'border-gray-200' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Overview of your support tickets</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border ${stat.border} ${stat.bg} p-5`}
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
