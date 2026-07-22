import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1rem',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '4rem' }}>404</span>
      <h1>Page not found</h1>
      <p style={{ color: 'var(--color-muted)' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link to="/dashboard" className="btn btn--primary">
        Go to Dashboard
      </Link>
    </div>
  );
}
