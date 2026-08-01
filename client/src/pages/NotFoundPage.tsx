import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4 gap-4">
      <span className="text-7xl font-black text-muted-foreground/30">404</span>
      <h1 className="text-xl font-bold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Link
        to="/dashboard"
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 h-9 transition hover:bg-primary/80"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
