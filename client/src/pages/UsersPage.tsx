import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';
import { authClient } from '@/lib/authClient';

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
      {[40, 160, 200, 70, 90].map((w, i) => (
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export function UsersPage() {
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
        {!isLoading && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {users.length} total
          </span>
        )}
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
    </div>
  );
}
