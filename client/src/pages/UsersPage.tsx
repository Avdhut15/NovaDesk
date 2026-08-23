import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';
import { authClient } from '@/lib/authClient';
import { UsersTable, type UserRecord } from './UsersTable';
import { CreateUserFormModal, EditUserFormModal, type CreateUserForm, type EditUserForm } from './UserForm';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleFilter = 'all' | 'admin' | 'agent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-px text-xs font-semibold tabular-nums ${active ? 'bg-primary/15 text-primary' : 'bg-muted-foreground/15 text-muted-foreground'}`}>
        {count}
      </span>
    </button>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchUsers(): Promise<UserRecord[]> {
  const { data } = await axios.get<{ success: boolean; data: UserRecord[] }>('/api/users', { withCredentials: true });
  return data.data ?? [];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading, error } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const errorMessage = isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : error?.message ?? null;

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || (roleFilter === 'admin' ? u.role === 'admin' : u.role !== 'admin');
    const q = search.trim().toLowerCase();
    return matchesRole && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const agentCount = users.filter((u) => u.role !== 'admin').length;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      try {
        const { data: result } = await axios.post('/api/users', { email: data.email, password: data.password, name: data.name });
        return result;
      } catch (err) {
        if (isAxiosError(err) && err.response?.data?.error) throw new Error(err.response.data.error);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (data: EditUserForm) => {
      try {
        const { data: result } = await axios.put(`/api/users/${editUser?.id}`, { email: data.email, name: data.name, password: data.password || undefined });
        return result;
      } catch (err) {
        if (isAxiosError(err) && err.response?.data?.error) throw new Error(err.response.data.error);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => { await axios.delete(`/api/users/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setUserToDelete(null);
    },
    onError: (err) => {
      alert(isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Failed to delete user');
      setUserToDelete(null);
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage agents and administrators</p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">{users.length} total</span>
          )}
          <button onClick={() => setIsCreateOpen(true)} className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            Create User
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-0.5">
            <FilterTab label="All" count={users.length} active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} />
            <FilterTab label="Admin" count={adminCount} active={roleFilter === 'admin'} onClick={() => setRoleFilter('admin')} />
            <FilterTab label="Agent" count={agentCount} active={roleFilter === 'agent'} onClick={() => setRoleFilter('agent')} />
          </div>
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input id="users-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring sm:w-64" />
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-destructive bg-destructive/5 border-b border-destructive/10">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
            {errorMessage}
          </div>
        )}

        {/* Table */}
        <UsersTable
          users={users}
          filtered={filtered}
          isLoading={isLoading}
          errorMessage={errorMessage}
          search={search}
          currentUserId={session?.user.id}
          onEdit={setEditUser}
          onDelete={setUserToDelete}
        />
      </div>

      {/* Modals */}
      {isCreateOpen && (
        <CreateUserFormModal
          isPending={createUserMutation.isPending}
          error={createUserMutation.error}
          onSubmit={(data) => createUserMutation.mutate(data)}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editUser && (
        <EditUserFormModal
          user={editUser}
          isPending={editUserMutation.isPending}
          error={editUserMutation.error}
          onSubmit={(data) => editUserMutation.mutate(data)}
          onClose={() => setEditUser(null)}
        />
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-lg border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-2">Delete User</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{userToDelete.name}</strong>? This action will disable their account.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setUserToDelete(null)} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted" disabled={deleteUserMutation.isPending}>Cancel</button>
              <button type="button" onClick={() => deleteUserMutation.mutate(userToDelete.id)} disabled={deleteUserMutation.isPending} className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
