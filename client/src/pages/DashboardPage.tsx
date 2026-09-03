import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketsBarChart } from '@/components/ui/chart';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  resolvedByAI: number;
  aiResolutionRate: number;
  avgResolutionTime: string;
  ticketsPerDay: { date: string; count: number }[];
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await axios.get<{ success: boolean; data: DashboardStats }>(
    '/api/dashboard/stats',
    { withCredentials: true },
  );
  return data.data;
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        ) : (
          <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 60_000, // refresh every minute
  });

  const metrics = [
    { label: 'Total Tickets',       value: data?.totalTickets ?? '—' },
    { label: 'Open Tickets',        value: data?.openTickets  ?? '—' },
    { label: 'Resolved by AI',      value: data?.resolvedByAI ?? '—' },
    { label: 'AI Resolution Rate',  value: data != null ? `${data.aiResolutionRate}%` : '—' },
    { label: 'Avg AI Resolution Time', value: data?.avgResolutionTime ?? '—' },
  ];

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Overview of your support operations</p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} loading={isLoading} />
        ))}
      </div>

      {/* ── Bar Chart ────────────────────────────────────────────────────────── */}
      <TicketsBarChart data={data?.ticketsPerDay ?? []} loading={isLoading} />
    </div>
  );
}
