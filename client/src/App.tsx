import { Navigate, Outlet } from 'react-router-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { authClient } from './lib/authClient';

// ─── Pages ────────────────────────────────────────────────────────────────────
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// ─── Layout ───────────────────────────────────────────────────────────────────
import { AppLayout } from './layouts/AppLayout';

// ─── Route protection ─────────────────────────────────────────────────────────
function ProtectedRoute() {
  const { data: session, isPending, isRefetching } = authClient.useSession();

  if (isPending || (isRefetching && !session)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-muted)',
        fontSize: '0.9rem',
        gap: '0.625rem',
      }}>
        <span style={{ fontSize: '1.25rem' }}>✦</span>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — session required */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tickets" element={<TicketsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
