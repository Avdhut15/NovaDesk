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
      <div className="min-h-screen bg-background flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
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
