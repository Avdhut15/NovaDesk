import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';
import { authClient } from '@/lib/authClient';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  createdAt: string;
}

type RoleFilter = 'all' | 'admin' | 'agent';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
      Agent
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-border last:border-0">
      {[40, 160, 200, 70, 90, 40].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded bg-muted animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Filter Tab ───────────────────────────────────────────────────────────────
function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-px text-xs font-semibold tabular-nums ${
          active
            ? 'bg-primary/15 text-primary'
            : 'bg-muted-foreground/15 text-muted-foreground'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Query fn ────────────────────────────────────────────────────────────────
async function fetchUsers(): Promise<UserRecord[]> {
  const { data } = await axios.get<{ success: boolean; data: UserRecord[] }>(
    '/api/users',
    { withCredentials: true }
  );
  return data.data ?? [];
}

const createUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});
type CreateUserForm = z.infer<typeof createUserSchema>;

const editUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional().refine(val => !val || val.length >= 8, {
    message: 'Password must be at least 8 characters if provided',
  })
});
type EditUserForm = z.infer<typeof editUserSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export function UsersPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema)
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors }
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema)
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      try {
        const { data: result } = await axios.post('/api/users', {
          email: data.email,
          password: data.password,
          name: data.name,
        });
        return result;
      } catch (error) {
        if (isAxiosError(error) && error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateModalOpen(false);
      reset();
    }
  });

  const onSubmit = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  const editUserMutation = useMutation({
    mutationFn: async (data: EditUserForm) => {
      try {
        const { data: result } = await axios.put(`/api/users/${editUser?.id}`, {
          email: data.email,
          name: data.name,
          password: data.password || undefined,
        });
        return result;
      } catch (error) {
        if (isAxiosError(error) && error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    }
  });

  const onEditSubmit = (data: EditUserForm) => {
    editUserMutation.mutate(data);
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUserToDelete(null);
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to delete user');
      }
      setUserToDelete(null);
    }
  });

  const { data: session } = authClient.useSession();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const errorMessage = isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : error?.message ?? null;

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');

  // ── Filter + search (client-side) ──────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' ? u.role === 'admin' : u.role !== 'admin');
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const agentCount = users.filter((u) => u.role !== 'admin').length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage agents and administrators
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {users.length} total
            </span>
          )}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Create User
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Role filter tabs */}
          <div className="flex items-center gap-0.5">
            <FilterTab
              label="All"
              count={users.length}
              active={roleFilter === 'all'}
              onClick={() => setRoleFilter('all')}
            />
            <FilterTab
              label="Admin"
              count={adminCount}
              active={roleFilter === 'admin'}
              onClick={() => setRoleFilter('admin')}
            />
            <FilterTab
              label="Agent"
              count={agentCount}
              active={roleFilter === 'agent'}
              onClick={() => setRoleFilter('agent')}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              id="users-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring sm:w-64"
            />
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-destructive bg-destructive/5 border-b border-destructive/10">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  User
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Role
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Verified
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Joined
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeletons */}
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}

              {/* Users */}
              {!isLoading &&
                filtered.map((u) => {
                  const isSelf = session?.user.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* Avatar + name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center select-none">
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              {u.name}
                            </span>
                            {isSelf && (
                              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                you
                              </span>
                            )}
                            {/* Email on mobile */}
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email (hidden on mobile) */}
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {u.email}
                      </td>

                      {/* Role badge */}
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Verified */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unverified</span>
                        )}
                      </td>

                      {/* Joined date */}
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditUser(u);
                              resetEdit({ name: u.name, email: u.email, password: '' });
                            }}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit user"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          
                          {u.role !== 'admin' ? (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title="Delete user"
                            >
                              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          ) : (
                            <div className="size-7" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {/* Empty state */}
              {!isLoading && !errorMessage && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <svg className="size-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <p className="text-sm">
                        {search
                          ? `No users match "${search}"`
                          : 'No users found'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg border border-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Create New User</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  {...register('password')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {createUserMutation.error && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {createUserMutation.error.message}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg border border-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Edit User</h2>
              <button
                onClick={() => setEditUser(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  {...registerEdit('name')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {editErrors.name && <p className="mt-1 text-xs text-destructive">{editErrors.name.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  {...registerEdit('email')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {editErrors.email && <p className="mt-1 text-xs text-destructive">{editErrors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Password (leave blank to keep current)</label>
                <input
                  type="password"
                  {...registerEdit('password')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                />
                {editErrors.password && <p className="mt-1 text-xs text-destructive">{editErrors.password.message}</p>}
              </div>

              {editUserMutation.error && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {editUserMutation.error.message}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUserMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {editUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-lg border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-2">Delete User</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{userToDelete.name}</strong>? This action will disable their account.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                disabled={deleteUserMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteUserMutation.mutate(userToDelete.id)}
                disabled={deleteUserMutation.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
