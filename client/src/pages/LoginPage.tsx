import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authClient } from '../lib/authClient';
import styles from './LoginPage.module.css';

// ─── Validation schema ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Component ────────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    const { error: signInError } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (signInError) {
      setError('root', {
        message: signInError.message ?? 'Invalid email or password.',
      });
      return;
    }

    // Ensure session store is fully hydrated before changing routes
    await authClient.getSession();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logoIcon}>✦</span>
          <h1 className={styles.title}>NovaDesk</h1>
          <p className={styles.subtitle}>Sign in to your support workspace</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder="agent@company.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <span className={styles.fieldError} role="alert">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <span className={styles.fieldError} role="alert">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Server / root error */}
          {errors.root && (
            <div className={styles.errorBox} role="alert">
              <span className={styles.errorIcon}>⚠</span>
              {errors.root.message}
            </div>
          )}

          <button
            type="submit"
            id="login-submit"
            className={`btn btn--primary ${styles.submitBtn}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className={styles.spinner} />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
