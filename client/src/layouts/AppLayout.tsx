import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/authClient';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const baseNavItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tickets', label: 'Tickets' },
];

const adminNavItems = [
  { to: '/users', label: 'Users' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const navItems = role === 'admin'
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top Navbar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Brand + Nav */}
            <div className="flex items-center gap-6">
              <span className="text-sm font-bold text-foreground tracking-tight">
                NovaDesk
              </span>

              <nav className="flex items-center gap-0.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* User area */}
            <div className="flex items-center gap-2">
              {/* Avatar + name */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center select-none">
                  {initials}
                </div>
                <span className="text-sm text-foreground font-medium hidden sm:block">
                  {user?.name ?? '—'}
                </span>
              </div>

              {/* Sign out */}
              <Button
                id="sign-out-btn"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
