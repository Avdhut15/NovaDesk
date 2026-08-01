import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardPage() {
  const stats = [
    { label: 'Open',     value: '—', color: 'text-primary' },
    { label: 'Resolved', value: '—', color: 'text-green-600' },
    { label: 'Closed',   value: '—', color: 'text-muted-foreground' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Overview of your support tickets</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
