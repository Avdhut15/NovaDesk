import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TicketsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Tickets</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ticket list with filtering and sorting — coming in Phase 4.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground font-normal text-center py-8">
            No tickets yet
          </CardTitle>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
