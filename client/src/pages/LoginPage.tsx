import styles from './LoginPage.module.css';

export function LoginPage() {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logoIcon}>✦</span>
          <h1 className={styles.title}>NovaDesk</h1>
          <p className={styles.subtitle}>Sign in to your support workspace</p>
        </div>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="agent@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className={`btn btn--primary ${styles.submitBtn}`}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
