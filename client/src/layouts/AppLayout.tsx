import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import styles from './AppLayout.module.css';

const navItems = [
  { to: '/dashboard', label: '📊 Dashboard' },
  { to: '/tickets', label: '🎫 Tickets' },
];

export function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.root}>
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>✦</span>
          <span className={styles.logoText}>NovaDesk</span>
        </div>

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

        <button className={`btn btn--ghost ${styles.logoutBtn}`} onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
