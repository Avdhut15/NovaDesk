import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/authClient';
import styles from './AppLayout.module.css';

const navItems = [
  { to: '/dashboard', label: '📊 Dashboard' },
  { to: '/tickets', label: '🎫 Tickets' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.root}>
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoIcon}>✦</span>
          <span className={styles.logoText}>NovaDesk</span>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user?.name ?? '—'}</span>
              {user?.role && (
                <span className={styles.roleTag}>{user.role}</span>
              )}
            </div>
          </div>

          <button
            id="sign-out-btn"
            className={`btn btn--ghost ${styles.signOutBtn}`}
            onClick={handleSignOut}
          >
            🚪 Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
