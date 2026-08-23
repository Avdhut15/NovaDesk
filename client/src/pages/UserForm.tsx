import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserRecord } from './UsersTable';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type CreateUserForm = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional().refine((val) => !val || val.length >= 8, {
    message: 'Password must be at least 8 characters if provided',
  }),
});
export type EditUserForm = z.infer<typeof editUserSchema>;

// ─── Shared form fields ───────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

// ─── Create User Form ────────────────────────────────────────────────────────

interface CreateUserFormProps {
  isPending: boolean;
  error: Error | null;
  onSubmit: (data: CreateUserForm) => void;
  onClose: () => void;
}

export function CreateUserFormModal({ isPending, error, onSubmit, onClose }: CreateUserFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg border border-border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Create New User</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <input type="text" {...register('name')} className={inputCls} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" {...register('email')} className={inputCls} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input type="password" {...register('password')} className={inputCls} />
          </Field>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error.message}</div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Form ───────────────────────────────────────────────────────────

interface EditUserFormProps {
  user: UserRecord;
  isPending: boolean;
  error: Error | null;
  onSubmit: (data: EditUserForm) => void;
  onClose: () => void;
}

export function EditUserFormModal({ user, isPending, error, onSubmit, onClose }: EditUserFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
  });

  useEffect(() => {
    reset({ name: user.name, email: user.email, password: '' });
  }, [user, reset]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg border border-border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Edit User</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <input type="text" {...register('name')} className={inputCls} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" {...register('email')} className={inputCls} />
          </Field>
          <Field label="Password (leave blank to keep current)" error={errors.password?.message}>
            <input type="password" {...register('password')} className={inputCls} placeholder="••••••••" />
          </Field>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error.message}</div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
